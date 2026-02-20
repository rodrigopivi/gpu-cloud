import { ApiTestClient } from './client';

// Colors for terminal output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
};

let testResults: { name: string; passed: boolean; error?: string }[] = [];

export function log(message: string, color?: keyof typeof colors) {
  const prefix = color ? colors[color] : '';
  const suffix = color ? colors.reset : '';
  console.log(`${prefix}${message}${suffix}`);
}

export async function runTest(
  name: string,
  testFn: () => Promise<boolean>,
  results: typeof testResults
): Promise<void> {
  process.stdout.write(`  ${name.padEnd(35)} `);
  try {
    const passed = await testFn();
    results.push({ name, passed });
    if (passed) {
      log('✓ PASS', 'green');
    } else {
      log('✗ FAIL', 'red');
    }
  } catch (error: any) {
    results.push({ name, passed: false, error: error.message });
    log(`✗ ERROR: ${error.message.substring(0, 30)}`, 'red');
  }
}

export async function runAllTests(baseUrl: string = 'http://localhost:3000'): Promise<boolean> {
  const client = new ApiTestClient(baseUrl);
  const results: typeof testResults = [];

  console.log('');
  log('╔══════════════════════════════════════════════════════════╗', 'blue');
  log('║         GPU Cloud Platform API Test Suite                ║', 'blue');
  log(`║         ${baseUrl.padEnd(52)} ║`, 'blue');
  log('╚══════════════════════════════════════════════════════════╝', 'blue');
  console.log('');

  const startTime = Date.now();

  // Test Group: Health & Auth
  log('▸ Health & Authentication', 'yellow');
  
  await runTest('Health Check', async () => {
    const health = await client.healthCheck();
    return health.status === 'healthy';
  }, results);

  await runTest('Login', async () => {
    const user = await client.login('admin@gpucloud.local', 'admin$123$');
    return user.email === 'admin@gpucloud.local';
  }, results);

  await runTest('Get Current User', async () => {
    const user = await client.getMe();
    return user.isAdmin === true;
  }, results);

  console.log('');
  log('▸ API Key Management', 'yellow');

  let createdKeyId: string;

  await runTest('Create API Key', async () => {
    const key = await client.createApiKey('Test Key', 100);
    createdKeyId = key.id;
    log(`\n    Key: ${key.key.substring(0, 35)}...`, 'yellow');
    return key.name === 'Test Key' && key.key.startsWith('sk-gpu-');
  }, results);

  await runTest('List API Keys', async () => {
    const keys = await client.listApiKeys();
    return keys.length > 0 && keys.some(k => k.id === createdKeyId);
  }, results);

  console.log('');
  log('▸ Inference Endpoints', 'yellow');

  await runTest('List Models', async () => {
    const models = await client.listModels();
    return models.some(m => m.id === 'gpt-4');
  }, results);

  await runTest('Chat Completion', async () => {
    const response = await client.chatCompletion(
      [{ role: 'user', content: 'Hello!' }],
      { model: 'gpt-3.5-turbo', maxTokens: 50 }
    );
    if (response.choices?.[0]?.message?.content) {
      log(`\n    "${response.choices[0].message.content.substring(0, 40)}..."`, 'yellow');
      return true;
    }
    return false;
  }, results);

  console.log('');
  log('▸ Monitoring & Metrics', 'yellow');

  await runTest('Get Workers', async () => {
    const { workers, stats } = await client.getWorkers();
    return workers.length > 0 && stats.total > 0;
  }, results);

  await runTest('Get Queue Status', async () => {
    const { stats } = await client.getQueueStatus();
    return typeof stats.pending === 'number';
  }, results);

  await runTest('Get Metrics', async () => {
    const metrics = await client.getMetrics();
    return metrics.summary && typeof metrics.summary.totalRequests === 'number';
  }, results);

  await runTest('Get Usage Overview', async () => {
    const usage = await client.getUsage();
    return usage.total && Array.isArray(usage.byApiKey);
  }, results);

  console.log('');
  log('▸ Cleanup', 'yellow');

  await runTest('Revoke API Key', async () => {
    await client.revokeApiKey(createdKeyId);
    const keys = await client.listApiKeys();
    const key = keys.find(k => k.id === createdKeyId);
    return key?.isActive === false;
  }, results);

  // Summary
  const duration = Date.now() - startTime;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log('');
  log('═══════════════════════════════════════════════════════════', 'blue');
  if (failed === 0) {
    log(`  ✅ All ${passed} tests passed (${duration}ms)`, 'green');
  } else {
    log(`  ❌ ${passed} passed, ${failed} failed (${duration}ms)`, failed === 0 ? 'green' : 'red');
  }
  log('═══════════════════════════════════════════════════════════', 'blue');
  console.log('');

  if (client.token) {
    log(`Auth Token: ${client.token.substring(0, 60)}...`, 'yellow');
  }
  console.log('');

  return failed === 0;
}

// Check Node.js version
const nodeVersion = process.versions.node;
const majorVersion = parseInt(nodeVersion.split('.')[0]);

if (majorVersion < 18) {
  console.error(`Error: This test requires Node.js 18+ (found ${nodeVersion})`);
  process.exit(1);
}

// Auto-run if called directly
if (require.main === module) {
  runAllTests(process.env.API_URL).catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

export default runAllTests;
