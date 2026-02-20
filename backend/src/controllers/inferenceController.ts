import { Request, Response } from 'express';
import inferenceService from '../services/inference';

export class InferenceController {
  // GET /v1/models
  async listModels(req: Request, res: Response): Promise<void> {
    try {
      const models = inferenceService.getModels();
      res.json({
        object: 'list',
        data: models,
      });
    } catch (error: any) {
      res.status(500).json({
        error: {
          message: error.message,
          type: 'internal_error',
        },
      });
    }
  }

  // GET /v1/models/:model
  async getModel(req: Request, res: Response): Promise<void> {
    try {
      const { model } = req.params;
      const models = inferenceService.getModels();
      const found = models.find(m => m.id === model);

      if (!found) {
        res.status(404).json({
          error: {
            message: `Model '${model}' not found`,
            type: 'invalid_request_error',
          },
        });
        return;
      }

      res.json(found);
    } catch (error: any) {
      res.status(500).json({
        error: {
          message: error.message,
          type: 'internal_error',
        },
      });
    }
  }

  // POST /v1/chat/completions
  async createChatCompletion(req: Request, res: Response): Promise<void> {
    try {
      const request = req.body;
      const apiKeyId = req.apiKey!.id;

      // Validate request
      if (!request.model) {
        res.status(400).json({
          error: {
            message: 'Missing required parameter: model',
            type: 'invalid_request_error',
          },
        });
        return;
      }

      if (!request.messages || !Array.isArray(request.messages)) {
        res.status(400).json({
          error: {
            message: 'Missing required parameter: messages',
            type: 'invalid_request_error',
          },
        });
        return;
      }

      // Handle streaming
      if (request.stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        try {
          const stream = inferenceService.createChatCompletionStream(request, apiKeyId);
          
          for await (const chunk of stream) {
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
          }
          
          res.write('data: [DONE]\n\n');
          res.end();
        } catch (error: any) {
          res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
          res.end();
        }
        return;
      }

      // Non-streaming response
      const response = await inferenceService.createChatCompletion(request, apiKeyId);
      res.json(response);
    } catch (error: any) {
      res.status(500).json({
        error: {
          message: error.message,
          type: 'internal_error',
        },
      });
    }
  }
}

export const inferenceController = new InferenceController();
export default inferenceController;
