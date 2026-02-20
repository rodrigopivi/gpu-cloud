import { ChatMessage } from '../types';

// Simple token estimation: ~4 characters per token on average
// This is a rough estimation. In production, you'd use tiktoken or similar
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function estimateMessagesTokens(messages: ChatMessage[]): number {
  let total = 0;
  for (const message of messages) {
    // Each message has overhead (~4 tokens for role, etc.)
    total += 4;
    total += estimateTokens(message.content);
    if (message.name) {
      total += estimateTokens(message.name);
    }
  }
  // Add completion overhead
  total += 2;
  return total;
}

export function generateCompletionTokens(maxTokens: number, content: string): number {
  const estimated = estimateTokens(content);
  return Math.min(estimated, maxTokens);
}

// Simulate token generation for streaming
export function* generateTokenStream(content: string, tokensPerSecond: number = 50): Generator<string> {
  const estimatedTokens = estimateTokens(content);
  const delayPerToken = 1000 / tokensPerSecond;
  const charsPerToken = Math.ceil(content.length / estimatedTokens);
  
  for (let i = 0; i < content.length; i += charsPerToken) {
    const chunk = content.slice(i, i + charsPerToken);
    yield chunk;
  }
}

// Generate realistic completion based on input
export function generateCompletion(messages: ChatMessage[]): string {
  const lastMessage = messages[messages.length - 1];
  const prompt = lastMessage?.content?.toLowerCase() || '';
  
  // Simple response generation based on prompt keywords
  if (prompt.includes('hello') || prompt.includes('hi')) {
    return 'Hello! How can I assist you today?';
  }
  if (prompt.includes('help')) {
    return 'I\'m here to help! What would you like to know?';
  }
  if (prompt.includes('code') || prompt.includes('programming')) {
    return 'Here\'s a code example:\n\n```python\ndef hello_world():\n    print("Hello, World!")\n\nhello_world()\n```\n\nThis simple function prints "Hello, World!" to the console.';
  }
  if (prompt.includes('explain') || prompt.includes('what is')) {
    return 'That\'s a great question! Let me explain this concept in detail. It involves several key principles that work together to create a comprehensive understanding of the subject matter.';
  }
  
  // Default response
  const defaultResponses = [
    'I understand your request. Let me provide a thoughtful response based on the context you\'ve provided.',
    'That\'s an interesting point! Here\'s my perspective on this matter.',
    'Thank you for sharing that. I\'ve processed your input and here\'s what I think.',
    'Based on our conversation, I\'d suggest considering the following approach.',
  ];
  
  return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
}
