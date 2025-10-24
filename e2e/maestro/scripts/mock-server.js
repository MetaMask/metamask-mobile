#!/usr/bin/env node
/* eslint-disable import/no-commonjs, import/no-nodejs-modules */
/**
 * Mock Server for Maestro Tests
 *
 * This script starts a mock HTTP server using Mockttp to intercept and mock API calls.
 * It's used in conjunction with Maestro tests to provide controlled responses for external APIs.
 *
 * Usage:
 *   node e2e/maestro/scripts/mock-server.js --action start --preset <preset-name>
 *   node e2e/maestro/scripts/mock-server.js --action stop
 *
 * Available presets:
 *   - feature-flags: Mock remote feature flags
 *   - default: Basic mocks for standard tests
 *
 * Examples:
 *   # Start mock server with feature flags
 *   node e2e/maestro/scripts/mock-server.js --action start --preset feature-flags
 *
 *   # Stop mock server
 *   node e2e/maestro/scripts/mock-server.js --action stop
 */

const path = require('path');
const { getLocal } = require('mockttp');
const fs = require('fs');

const MOCK_SERVER_PORT = 8000; // Must match Detox DEFAULT_MOCKSERVER_PORT
const PID_FILE = '/tmp/maestro-mock-server.pid';

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    action: 'start',
    preset: 'default',
  };

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const value = args[i + 1];
    options[key] = value;
  }

  return options;
}

// Feature flag mocks (mimics remoteFeatureMultichainAccountsAccountDetailsV2(true))
const featureFlagMocks = {
  enableMultichainAccountsState2: {
    enabled: true,
    featureVersion: '2',
    minimumVersion: '7.46.0',
  },
};

async function setupFeatureFlagMocks(mockServer) {
  // Health check endpoint - required for app to detect mock server
  await mockServer
    .forGet('/health-check')
    .thenReply(200, 'OK');

  console.log('✅ Health check endpoint configured');

  // Set up proxy handler for mobile app (E2E apps route requests through /proxy endpoint)
  await mockServer
    .forAnyRequest()
    .matching((request) => request.path.startsWith('/proxy'))
    .thenCallback(async (request) => {
      const urlParam = new URL(request.url).searchParams.get('url');

      if (!urlParam) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Missing url parameter' }),
        };
      }

      console.log(`[Mock Server] Proxy request for: ${urlParam}`);

      // Check if this is a feature flags request
      if (urlParam.includes('client-config.api.cx.metamask.io/v1/flags')) {
        console.log(`[Mock Server] ✅ Returning mocked feature flags`);
        return {
          statusCode: 200,
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify([featureFlagMocks]),
        };
      }

      // Pass through other requests to real servers
      console.log(`[Mock Server] → Pass-through to real server`);
      try {
        const headers = {};
        // Copy headers from original request
        for (const [key, value] of Object.entries(request.headers)) {
          if (typeof value === 'string') {
            headers[key] = value;
          }
        }

        const response = await fetch(urlParam, {
          method: request.method,
          headers,
        });

        const responseBody = await response.text();
        console.log(`[Mock Server] ← Response: ${response.status}`);

        return {
          statusCode: response.status,
          headers: {
            'content-type': response.headers.get('content-type') || 'application/json',
          },
          body: responseBody,
        };
      } catch (error) {
        console.error(`[Mock Server] ❌ Error proxying request: ${error.message}`);
        return {
          statusCode: 500,
          body: JSON.stringify({ error: 'Proxy error', message: error.message }),
        };
      }
    });

  console.log('✅ Feature flag mocks configured (via proxy endpoint)');
  console.log(`   Mocked flag: enableMultichainAccountsState2 = ${JSON.stringify(featureFlagMocks.enableMultichainAccountsState2)}`);
}

async function setupDefaultMocks(mockServer) {
  // Add any default mocks here
  console.log('✅ Default mocks configured');
}

async function startMockServer(preset) {
  console.log('🚀 Starting mock server...');
  console.log(`   Port: ${MOCK_SERVER_PORT}`);
  console.log(`   Preset: ${preset}`);

  try {
    const mockServer = getLocal();
    await mockServer.start(MOCK_SERVER_PORT);

    // Setup mocks based on preset
    if (preset === 'feature-flags') {
      await setupFeatureFlagMocks(mockServer);
    } else {
      await setupDefaultMocks(mockServer);
    }

    // Save PID for later cleanup
    fs.writeFileSync(PID_FILE, process.pid.toString());

    console.log('✅ Mock server started successfully!');
    console.log(`   Server is running at: http://localhost:${MOCK_SERVER_PORT}`);
    console.log('   Press Ctrl+C to stop the server.');

    // Keep the process alive
    process.on('SIGTERM', async () => {
      console.log('\n🛑 Stopping mock server...');
      await mockServer.stop();
      if (fs.existsSync(PID_FILE)) {
        fs.unlinkSync(PID_FILE);
      }
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('\n🛑 Stopping mock server...');
      await mockServer.stop();
      if (fs.existsSync(PID_FILE)) {
        fs.unlinkSync(PID_FILE);
      }
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to start mock server:', error.message);
    process.exit(1);
  }
}

function stopMockServer() {
  console.log('🛑 Stopping mock server...');

  try {
    if (fs.existsSync(PID_FILE)) {
      const pid = fs.readFileSync(PID_FILE, 'utf-8').trim();
      try {
        process.kill(parseInt(pid), 'SIGTERM');
        fs.unlinkSync(PID_FILE);
        console.log('✅ Mock server stopped');
      } catch (err) {
        console.log('ℹ️  Mock server process not found (may have already stopped)');
        fs.unlinkSync(PID_FILE);
      }
    } else {
      console.log('ℹ️  No mock server running');
    }
  } catch (error) {
    console.error('⚠️  Error stopping mock server:', error.message);
    process.exit(1);
  }
}

// Main execution
async function main() {
  const options = parseArgs();

  if (options.action === 'start') {
    await startMockServer(options.preset);
  } else if (options.action === 'stop') {
    stopMockServer();
  } else {
    console.error(`Unknown action: ${options.action}`);
    console.error('Valid actions: start, stop');
    process.exit(1);
  }
}

main();

