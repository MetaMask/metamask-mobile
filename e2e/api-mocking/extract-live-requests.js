#!/usr/bin/env node
/* eslint-disable import/no-nodejs-modules */

/**
 * Extract live requests from E2E test logs and generate mocks
 * This works with the existing test infrastructure by parsing console logs
 */

import { spawn } from 'child_process';
import { writeFile, mkdir, readdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Parse live server request logs and extract request-response information
 */
function parseLiveRequestLogs(logLines) {
  const liveRequests = [];
  const capturedData = [];

  // Updated patterns to handle custom logger prefixes (detox, timestamps, colors, etc.)
  const requestPattern = /.*Request going to live server: (.+)/;
  const capturePattern = /.*CAPTURE_REQUEST: (.+)/;
  const errorPattern = /.*CAPTURE_ERROR: (.+)/;

  for (const line of logLines) {
    // Parse old-style warnings (fallback)
    const requestMatch = line.match(requestPattern);
    if (requestMatch) {
      const url = requestMatch[1];
      liveRequests.push({
        url: url.trim(),
        timestamp: new Date().toISOString(),
        method: 'GET', // Default to GET
      });
    }

    // Parse new-style captured request-response pairs
    const captureMatch = line.match(capturePattern);
    if (captureMatch) {
      try {
        const captureData = JSON.parse(captureMatch[1]);
        capturedData.push(captureData);
      } catch (e) {
        console.warn('Failed to parse captured data:', captureMatch[1]);
      }
    }

    // Parse capture errors
    const errorMatch = line.match(errorPattern);
    if (errorMatch) {
      try {
        const errorData = JSON.parse(errorMatch[1]);
        capturedData.push({ ...errorData, captureError: true });

        // Log timeout errors specifically
        if (errorData.error && errorData.error.includes('timeout')) {
          console.warn(
            `⚠️  Timeout detected for ${errorData.method || 'GET'} ${
              errorData.url
            }`,
          );
        }
      } catch (e) {
        console.warn('Failed to parse capture error:', errorMatch[1]);
      }
    }
  }

  // Prefer captured data if available, fallback to parsed warnings
  if (capturedData.length > 0) {
    console.log(
      `📊 Found ${capturedData.length} captured request-response pairs`,
    );
    return deduplicateCapturedData(capturedData);
  }
  console.log(
    `📊 Fallback: Found ${liveRequests.length} requests from warning logs`,
  );
  return deduplicateLiveRequests(liveRequests);
}

/**
 * Remove duplicate captured data entries
 */
function deduplicateCapturedData(capturedData) {
  const seen = new Set();
  return capturedData.filter((data) => {
    const key = `${data.method || 'GET'}:${data.url}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * Remove duplicate live request entries (fallback)
 */
function deduplicateLiveRequests(liveRequests) {
  return liveRequests.filter(
    (req, index, arr) => arr.findIndex((r) => r.url === req.url) === index,
  );
}

/**
 * Generate mock events from captured requests (with real response data)
 */
function generateMockEvents(capturedRequests) {
  const mockEvents = {};

  for (const captured of capturedRequests) {
    const url = captured.url;
    const method = captured.method || determineMethod(url);
    const hasRealResponse = captured.responseStatus !== undefined;

    if (!mockEvents[method]) {
      mockEvents[method] = [];
    }

    let mockEvent;

    if (hasRealResponse) {
      mockEvent = {
        urlEndpoint: url,
        method,
        responseCode: captured.responseStatus,
        response: captured.responseBody,
        _metadata: {
          capturedAt: captured.timestamp,
          duration: captured.duration,
          realResponse: true,
        },
      };

      if (captured.requestBody) {
        try {
          mockEvent.requestBody = JSON.parse(captured.requestBody);

          // Auto-add ignoreFields for JSON-RPC requests
          if (
            mockEvent.requestBody.jsonrpc &&
            mockEvent.requestBody.id !== undefined
          ) {
            mockEvent.ignoreFields = ['id', 'method'];
          }
        } catch (e) {
          // Not valid JSON, keep as string (e.g., form data, plain text)
          mockEvent.requestBody = captured.requestBody;
        }
      }
    } else {
      // Simple fallback for when real response isn't available
      mockEvent = {
        urlEndpoint: url,
        method,
        responseCode: 200,
        response: generateMockResponse(url),
        _metadata: {
          capturedAt: captured.timestamp || new Date().toISOString(),
          realResponse: false,
          generated: true,
        },
      };

      // Add simple fallback request body for POST methods
      if (['POST', 'PUT', 'PATCH'].includes(method)) {
        mockEvent.requestBody = generateMockRequestBody();
      }
    }

    // Check for duplicates
    if (!mockEvents[method].find((m) => m.urlEndpoint === url)) {
      mockEvents[method].push(mockEvent);
    }
  }

  return mockEvents;
}

/**
 * Determine HTTP method - defaults to GET for fallback cases
 */
function determineMethod(url) {
  // Default to GET - real captures will have the actual method
  return 'GET';
}

/**
 * Generate a mock response based on URL patterns
 */
function generateMockResponse(url) {
  return {
    mocked: true,
    message: 'This mock response needs to be updated with real data',
    url,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generate mock request body - simple fallback for when real body isn't captured
 */
function generateMockRequestBody() {
  return {
    fallback: true,
    message: 'Request body not captured - update with real data if needed',
  };
}

/**
 * Run E2E test and capture console output
 */
async function runTestAndCaptureLogs(platform, testFile) {
  const testName = path.basename(testFile, '.spec.ts');

  console.log(`🚀 Running ${platform} E2E test: ${testName}`);
  console.log(`📋 Capturing live server requests...`);

  const testCommand =
    platform === 'android'
      ? ['test:e2e:android:debug:run', testFile]
      : ['test:e2e:ios:debug:run', testFile];

  const logLines = [];

  return new Promise((resolve, reject) => {
    const testProcess = spawn('yarn', testCommand, {
      cwd: path.join(__dirname, '../..'),
      env: {
        ...process.env,
        IS_TEST: 'true',
        NODE_OPTIONS: '--experimental-vm-modules',
        CAPTURE_MODE: 'true',
      },
    });

    // Capture stdout
    testProcess.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');
      logLines.push(...lines);
      // Still show output in real-time
      process.stdout.write(data);
    });

    // Capture stderr
    testProcess.stderr.on('data', (data) => {
      const lines = data.toString().split('\n');
      logLines.push(...lines);
      // Still show output in real-time
      process.stderr.write(data);
    });

    testProcess.on('close', async (code) => {
      console.log(`\n📊 Test completed with exit code: ${code}`);
      console.log(`📝 Captured ${logLines.length} log lines`);

      // Wait for any remaining long-running requests to complete
      // This allows time for the logs to be fully written even if requests were
      // initiated just before the test process ended
      const additionalWaitTime =
        parseInt(process.env.REQUEST_CAPTURE_WAIT_TIME) || 10000; // Default 10 seconds
      console.log(
        `⏳ Waiting ${
          additionalWaitTime / 1000
        } seconds for any pending requests to complete...`,
      );

      await new Promise((resolve) => setTimeout(resolve, additionalWaitTime));

      console.log(`📝 Final log count: ${logLines.length} lines`);

      resolve({ code, logLines, testName });
    });

    testProcess.on('error', (error) => {
      console.error(`❌ Failed to start test: ${error.message}`);
      reject(error);
    });
  });
}

/**
 * Save generated mocks and create documentation
 */
async function saveMocks(mockEvents, testName, liveRequests) {
  const outputDir = path.join(__dirname, '../api-mocking/captured-mocks');
  await mkdir(outputDir, { recursive: true });

  // Save mock events
  const mockFile = path.join(outputDir, `${testName}-mocks.json`);
  await writeFile(mockFile, JSON.stringify(mockEvents, null, 2));

  console.log(`✅ Generated mocks saved to: ${mockFile}`);

  // Save raw requests for reference
  const requestsFile = path.join(outputDir, `${testName}-requests.json`);
  await writeFile(requestsFile, JSON.stringify(liveRequests, null, 2));

  // Generate documentation
  const readmeContent = `# Generated Mocks for ${testName}

Generated on: ${new Date().toISOString()}

## Usage

**Step 1:** Copy the mock file to a tracked location:
\`\`\`bash
cp ${mockFile} e2e/mock-responses/${testName}-mocks.json
\`\`\`

**Step 2:** Import and use the copied mocks in your test:

\`\`\`javascript
import mockEvents from '../mock-responses/${testName}-mocks.json';
import { startMockServer } from '../api-mocking/mock-server.js';

// In your test setup
beforeAll(async () => {
  const mockServerPort = getMockServerPort();
  mockServer = await startMockServer(mockEvents, mockServerPort);
});
\`\`\`

## Captured Live Requests

${liveRequests
  .map((req, i) => `${i + 1}. **${req.method} ${req.url}**`)
  .join('\n')}

## Generated Mock Events

${Object.entries(mockEvents)
  .map(
    ([method, events]) =>
      `### ${method} (${events.length} endpoints)\n${events
        .map((e) => `- ${e.urlEndpoint}`)
        .join('\n')}`,
  )
  .join('\n\n')}

## Next Steps

1. Copy the mock file to a tracked location (since \`captured-mocks/\` is gitignored):
   \`\`\`bash
   cp ${mockFile} e2e/mock-responses/${testName}-mocks.json
   \`\`\`
2. Import the copied mocks in your test file
3. Run your test again to verify mocks work correctly
4. Adjust mock responses if needed for your specific test scenarios

**Note:** The \`captured-mocks/\` folder is gitignored to avoid committing temporary files. Always copy the mocks you want to use to a tracked location.
`;

  const readmeFile = path.join(outputDir, `${testName}-README.md`);
  await writeFile(readmeFile, readmeContent);

  console.log(`📋 Documentation saved to: ${readmeFile}`);

  return { mockFile, requestsFile, readmeFile };
}

// CLI usage
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: node extract-live-requests.js <platform> <test-file>');
    console.log(
      'Example: node extract-live-requests.js android e2e/specs/notifications/enable-notifications-after-onboarding.spec.ts',
    );
    process.exit(1);
  }

  const [platform, testFile] = args;

  if (platform !== 'android' && platform !== 'ios') {
    console.error(`❌ Unsupported platform: ${platform}`);
    process.exit(1);
  }

  try {
    // Run test and capture logs
    const { code, logLines, testName } = await runTestAndCaptureLogs(
      platform,
      testFile,
    );

    // Parse captured requests from logs
    const capturedRequests = parseLiveRequestLogs(logLines);
    console.log(`🌐 Found ${capturedRequests.length} unique requests`);

    if (capturedRequests.length === 0) {
      console.log(
        '⚠️  No requests found. This test might already be fully mocked!',
      );
      process.exit(0);
    }

    // Check how many have real response data
    const realResponses = capturedRequests.filter(
      (r) => r.responseStatus !== undefined,
    );
    if (realResponses.length > 0) {
      console.log(`🎯 Captured ${realResponses.length} real API responses!`);
    } else {
      console.log(
        `⚙️ Using generated responses (no real response data captured)`,
      );
    }

    // Generate mock events
    const mockEvents = generateMockEvents(capturedRequests);
    const totalMocks = Object.values(mockEvents).flat().length;
    console.log(`✨ Generated ${totalMocks} mock events`);

    // Save everything
    const files = await saveMocks(mockEvents, testName, capturedRequests);

    console.log('\n🎉 Request capture completed!');
    console.log('\n📁 Generated files:');
    console.log(`   - Mocks: ${files.mockFile}`);
    console.log(`   - Requests: ${files.requestsFile}`);
    console.log(`   - Documentation: ${files.readmeFile}`);

    console.log('\n🚀 Next steps:');
    console.log('   1. Copy the mock file to a tracked location:');
    console.log(
      `      cp ${files.mockFile} e2e/mock-responses/${testName}-mocks.json`,
    );
    console.log('   2. Import the copied mocks in your test file');
    console.log('   3. Review and adjust mock responses if needed');

    console.log('\n💡 Tips for capturing longer requests:');
    console.log(
      '   - Set REQUEST_CAPTURE_WAIT_TIME=20000 (or higher) to wait longer for requests',
    );
    console.log(
      '   - Longer requests (>30s) will timeout and be logged as errors',
    );
    console.log(
      '   - Check the captured errors for timeout issues if requests seem to be missing',
    );
  } catch (error) {
    console.error('❌ Error during capture:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
