import { spawn, ChildProcess } from 'child_process';
import { ApiTestClient } from './client';
import { runAllTests, log } from './api.test';

const PORT = process.env.PORT || '3000';
const BASE_URL = `http://localhost:${PORT}`;
const MAX_RETRIES = 30;
const RETRY_DELAY = 1000;

async function waitForServer(url: string, maxRetries: number = MAX_RETRIES): Promise<boolean> {
  const client = new ApiTestClient(url);
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      await client.healthCheck();
      return true;
    } catch {
      process.stdout.write('.');
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
  return false;
}

async function startServer(): Promise<ChildProcess> {
  log('\n🚀 Starting server...', 'blue');
  
  const server = spawn('npm', ['run', 'dev'], {
    cwd: process.cwd(),
    stdio: 'pipe',
    shell: true,
    env: { ...process.env, NODE_ENV: 'test' }
  });

  // Suppress server output for cleaner test output
  server.stdout?.on('data', () => {});
  server.stderr?.on('data', () => {});

  return server;
}

function stopServer(server: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    log('\n🛑 Stopping server...', 'blue');
    
    // Try graceful shutdown first
    server.kill('SIGTERM');
    
    // Force kill after 5 seconds
    setTimeout(() => {
      server.kill('SIGKILL');
      resolve();
    }, 5000);

    server.on('exit', () => {
      resolve();
    });
  });
}

async function main() {
  log('╔══════════════════════════════════════════════════════════╗', 'blue');
  log('║    GPU Cloud Platform - Self-Contained Test Runner       ║', 'blue');
  log(`║    Target: ${BASE_URL.padEnd(46)} ║`, 'blue');
  log('╚══════════════════════════════════════════════════════════╝', 'blue');

  let server: ChildProcess | null = null;
  let startedServer = false;
  let success = false;

  try {
    // Check if server is already running
    const client = new ApiTestClient(BASE_URL);
    try {
      await client.healthCheck();
      log('\n✓ Server already running, using existing instance', 'green');
    } catch {
      // Start server if not running
      server = await startServer();
      startedServer = true;
      
      log('\n⏳ Waiting for server to be ready...', 'yellow');
      const ready = await waitForServer(BASE_URL);
      
      if (!ready) {
        log('\n❌ Server failed to start within timeout', 'red');
        process.exit(1);
      }
      
      log('\n✓ Server ready!', 'green');
    }

    // Run tests
    success = await runAllTests(BASE_URL);

  } catch (error: any) {
    log(`\n❌ Test runner error: ${error.message}`, 'red');
    success = false;
  } finally {
    // Cleanup - only stop if we started it
    if (server && startedServer) {
      await stopServer(server);
    }
  }

  process.exit(success ? 0 : 1);
}

// Handle interrupts
process.on('SIGINT', () => {
  log('\n\nInterrupted by user', 'yellow');
  process.exit(130);
});

main();
