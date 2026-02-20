import { 
  ChatCompletionRequest, 
  ChatCompletionResponse, 
  ChatCompletionStreamChunk,
  UsageRecord 
} from '../types';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import store from './store';
import taskQueue from './taskQueue';
import { NVIDIA_API_KEY } from '../config';

// NVIDIA API Configuration
const NVIDIA_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const DEFAULT_MODEL = 'nvidia/nemotron-3-nano-30b-a3b';

// Available models from NVIDIA
const NVIDIA_MODELS = [
  { id: 'nvidia/nemotron-3-nano-30b-a3b', name: 'Nemotron 3 Nano', contextWindow: 32768 },
  { id: 'nvidia/llama-3.1-nemotron-70b-instruct', name: 'Llama 3.1 Nemotron 70B', contextWindow: 131072 },
  { id: 'meta/llama-3.2-3b-instruct', name: 'Llama 3.2 3B', contextWindow: 131072 },
  { id: 'meta/llama3-8b-instruct', name: 'Llama 3 8B', contextWindow: 8192 },
];

export class InferenceService {
  getModels() {
    const now = Math.floor(Date.now() / 1000);
    return NVIDIA_MODELS.map(model => ({
      id: model.id,
      object: 'model',
      created: now,
      owned_by: model.id.split('/')[0],
      permission: [],
      root: model.id,
      parent: null,
    }));
  }

  async createChatCompletion(
    request: ChatCompletionRequest,
    apiKeyId: string
  ): Promise<ChatCompletionResponse> {
    const startTime = Date.now();
    
    // Use NVIDIA model or default
    const model = request.model?.startsWith('nvidia/') || request.model?.startsWith('meta/') 
      ? request.model 
      : DEFAULT_MODEL;

    // Queue task for distributed processing
    const taskId = await taskQueue.enqueue('chat_completion', request, apiKeyId);
    
    try {
      // Call NVIDIA API
      const response = await axios.post(
        NVIDIA_API_URL,
        {
          model,
          messages: request.messages,
          temperature: request.temperature ?? 0.5,
          top_p: request.top_p ?? 1,
          max_tokens: request.max_tokens ?? 1024,
          stream: false,
        },
        {
          headers: {
            'Authorization': `Bearer ${NVIDIA_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        }
      );

      const nvidiaResponse = response.data;
      const latencyMs = Date.now() - startTime;

      // Record usage
      const usage = nvidiaResponse.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
      this.recordUsage(apiKeyId, model, usage.prompt_tokens, usage.completion_tokens, usage.total_tokens, latencyMs, 200);

      // Update API key usage
      const apiKey = store.getApiKey(apiKeyId);
      if (apiKey) {
        store.updateApiKey(apiKeyId, {
          usageCount: apiKey.usageCount + 1,
          lastUsedAt: new Date(),
        });
      }

      // Complete the task
      taskQueue.resolveTask(taskId, { success: true });

      return {
        id: nvidiaResponse.id || `chatcmpl-${uuidv4()}`,
        object: 'chat.completion',
        created: nvidiaResponse.created || Math.floor(Date.now() / 1000),
        model: nvidiaResponse.model || model,
        choices: nvidiaResponse.choices.map((choice: any, index: number) => ({
          index,
          message: {
            role: choice.message.role,
            content: choice.message.content,
          },
          finish_reason: choice.finish_reason,
        })),
        usage: {
          prompt_tokens: usage.prompt_tokens,
          completion_tokens: usage.completion_tokens,
          total_tokens: usage.total_tokens,
        },
      };
    } catch (error) {
      taskQueue.rejectTask(taskId, error instanceof Error ? error.message : 'NVIDIA API error');
      throw error;
    }
  }

  async *createChatCompletionStream(
    request: ChatCompletionRequest,
    apiKeyId: string
  ): AsyncGenerator<ChatCompletionStreamChunk> {
    const startTime = Date.now();
    
    // Use NVIDIA model or default
    const model = request.model?.startsWith('nvidia/') || request.model?.startsWith('meta/') 
      ? request.model 
      : DEFAULT_MODEL;

    // Queue task
    const taskId = await taskQueue.enqueue('chat_completion', request, apiKeyId);
    
    let totalTokens = 0;
    let promptTokens = 0;
    let completionTokens = 0;

    try {
      // Call NVIDIA API with streaming
      const response = await axios.post(
        NVIDIA_API_URL,
        {
          model,
          messages: request.messages,
          temperature: request.temperature ?? 0.5,
          top_p: request.top_p ?? 1,
          max_tokens: request.max_tokens ?? 1024,
          stream: true,
        },
        {
          headers: {
            'Authorization': `Bearer ${NVIDIA_API_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
          },
          responseType: 'stream',
          timeout: 120000,
        }
      );

      const stream = response.data;
      let buffer = '';

      for await (const chunk of stream) {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const choice = parsed.choices?.[0];
              
              if (choice?.delta?.content) {
                totalTokens++;
                completionTokens++;
              }

              yield {
                id: parsed.id || `chatcmpl-${uuidv4()}`,
                object: 'chat.completion.chunk',
                created: parsed.created || Math.floor(Date.now() / 1000),
                model: parsed.model || model,
                choices: [{
                  index: choice?.index || 0,
                  delta: {
                    content: choice?.delta?.content || '',
                  },
                  finish_reason: choice?.finish_reason || null,
                }],
              };

              // Track usage if provided in final chunk
              if (parsed.usage) {
                promptTokens = parsed.usage.prompt_tokens || 0;
                completionTokens = parsed.usage.completion_tokens || completionTokens;
                totalTokens = parsed.usage.total_tokens || totalTokens;
              }
            } catch (e) {
              // Ignore parse errors for partial chunks
            }
          }
        }
      }

      const latencyMs = Date.now() - startTime;

      // Estimate tokens if not provided
      if (promptTokens === 0) {
        promptTokens = request.messages.reduce((acc, m) => acc + m.content.length / 4, 0);
      }
      if (completionTokens === 0) {
        completionTokens = totalTokens;
      }
      const finalTotalTokens = promptTokens + completionTokens;

      // Record usage
      this.recordUsage(apiKeyId, model, Math.ceil(promptTokens), Math.ceil(completionTokens), Math.ceil(finalTotalTokens), latencyMs, 200);

      // Update API key usage
      const apiKey = store.getApiKey(apiKeyId);
      if (apiKey) {
        store.updateApiKey(apiKeyId, {
          usageCount: apiKey.usageCount + 1,
          lastUsedAt: new Date(),
        });
      }

      // Complete the task
      taskQueue.resolveTask(taskId, { success: true });

    } catch (error) {
      taskQueue.rejectTask(taskId, error instanceof Error ? error.message : 'NVIDIA API error');
      throw error;
    }
  }

  private recordUsage(
    apiKeyId: string,
    model: string,
    promptTokens: number,
    completionTokens: number,
    totalTokens: number,
    latencyMs: number,
    statusCode: number
  ): void {
    const record: UsageRecord = {
      id: uuidv4(),
      apiKeyId,
      endpoint: '/v1/chat/completions',
      model,
      promptTokens: Math.ceil(promptTokens),
      completionTokens: Math.ceil(completionTokens),
      totalTokens: Math.ceil(totalTokens),
      latencyMs,
      statusCode,
      timestamp: new Date(),
    };
    
    store.addUsageRecord(record);
  }
}

export const inferenceService = new InferenceService();
export default inferenceService;
