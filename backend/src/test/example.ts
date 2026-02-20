/**
 * Example: Using the API Test Client
 * 
 * This demonstrates how to use the ApiTestClient for scripting
 * or programmatic API testing.
 * 
 * Run with: npx ts-node src/test/example.ts
 */

import { ApiTestClient } from './client';

async function main() {
  // Create client
  const client = new ApiTestClient('http://localhost:3000');

  console.log('=== GPU Cloud Platform API Example ===\n');

  // 1. Health check
  console.log('1. Checking health...');
  const health = await client.healthCheck();
  console.log(`   Status: ${health.status}\n`);

  // 2. Login
  console.log('2. Logging in...');
  const user = await client.login('admin@gpucloud.local', 'admin123');
  console.log(`   Welcome, ${user.email}!`);
  console.log(`   Admin: ${user.isAdmin}\n`);

  // 3. Create API key
  console.log('3. Creating API key...');
  const key = await client.createApiKey('My Test Key', 120);
  console.log(`   Key Name: ${key.name}`);
  console.log(`   Key ID: ${key.id}`);
  console.log(`   Key: ${key.key.substring(0, 40)}...\n`);

  // 4. List available models
  console.log('4. Available models:');
  const models = await client.listModels();
  models.slice(0, 5).forEach(m => {
    console.log(`   - ${m.id}`);
  });
  console.log('');

  // 5. Chat completion
  console.log('5. Testing chat completion...');
  const response = await client.chatCompletion(
    [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'What is 2+2?' }
    ],
    { model: 'gpt-3.5-turbo', maxTokens: 50 }
  );
  console.log(`   Response: ${response.choices[0].message.content}`);
  console.log(`   Tokens used: ${response.usage.total_tokens}\n`);

  // 6. Streaming completion
  console.log('6. Testing streaming completion...');
  process.stdout.write('   Response: ');
  for await (const chunk of client.chatCompletionStream(
    [{ role: 'user', content: 'Count to 3' }],
    { maxTokens: 20 }
  )) {
    const content = chunk.choices?.[0]?.delta?.content;
    if (content) {
      process.stdout.write(content);
    }
  }
  console.log('\n');

  // 7. Check workers
  console.log('7. GPU Workers:');
  const { workers, stats } = await client.getWorkers();
  console.log(`   Total: ${stats.total}, Online: ${stats.online}`);
  workers.forEach(w => {
    console.log(`   - ${w.hostname}: ${w.gpuInfo.name} (${w.status})`);
  });
  console.log('');

  // 8. Check metrics
  console.log('8. Platform metrics:');
  const metrics = await client.getMetrics();
  console.log(`   Total requests: ${metrics.summary.totalRequests}`);
  console.log(`   Total tokens: ${metrics.summary.totalTokens}`);
  console.log(`   Avg latency: ${metrics.summary.avgLatencyMs}ms\n`);

  // 9. List API keys
  console.log('9. Your API keys:');
  const keys = await client.listApiKeys();
  keys.forEach(k => {
    console.log(`   - ${k.name}: ${k.usageCount} requests (${k.isActive ? 'active' : 'revoked'})`);
  });
  console.log('');

  console.log('=== Example completed successfully! ===');
}

main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
