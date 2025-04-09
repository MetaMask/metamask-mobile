/* eslint-disable import/no-nodejs-modules */
/* eslint-disable no-console */
import { getLocal } from 'mockttp';
import portfinder from 'portfinder';
import { readFile, writeFile, access, mkdir } from 'fs/promises';
import path from 'path';

const LOGS_DIR = 'api-monitor-logs';

const CONSOLE_LOG_CONFIG = {
  showHeaders: false,
  showRequestBody: true,
  showResponseBody: false,
};

/**
 * Checks if a directory exists at the specified path.
 *
 * @param {string} dir - The path of the directory to check.
 * @returns {Promise<boolean>} A promise that resolves to `true` if the directory exists, or `false` otherwise.
 */
const dirExists = async (dir) => {
  try {
    await access(dir);
    return true;
  }
  catch (error) {
    return false;
  }
};

/**
 * Creates a new log file name with timestamp
 * @returns {string} The log file path
 */
const createLogFile = async () => {
  const logsDirExists = await dirExists(LOGS_DIR);
  if (!logsDirExists) {
    await mkdir(LOGS_DIR, { recursive: true });
  }

  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '-')
    .replace('Z', '');

  const logFile = path.join(LOGS_DIR, `api-monitor-${timestamp}.json`);
  await writeFile(logFile, '[]');
  return logFile;
};

// For locking files during write operations
const fileLocks = new Map();

/**
 * Acquire a lock for a file
 * @param {string} filePath - The path to the file
 * @returns {Promise<void>}
 */
const acquireLock = async (filePath) => {
  while (fileLocks.get(filePath)) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  fileLocks.set(filePath, true);
};

/**
 * Release a lock for a file
 * @param {string} filePath - The path to the file
 */
const releaseLock = (filePath) => {
  fileLocks.delete(filePath);
};

/**
 * Write log entry to JSON file with retry mechanism
 * @param {string} logFile - The path to the log file
 * @param {Object} logEntry - The log entry to write
 * @param {number} retries - Number of retries for file operations
 */
const writeToLogFile = async (logFile, logEntry, retries = 3) => {
  await acquireLock(logFile);

  try {
    for (let i = 0; i < retries; i++) {
      try {
        const fileContent = await readFile(logFile, 'utf8');
        let logs;

        try {
          logs = JSON.parse(fileContent);
        } catch (parseError) {
          // If JSON is corrupted, try to recover by reading the file line by line
          console.warn('JSON parse error, attempting to recover...');
          const lines = fileContent.split('\n').filter(line => line.trim());
          logs = [];
          for (const line of lines) {
            try {
              const entry = JSON.parse(line);
              logs.push(entry);
            } catch (e) {
              console.warn('Skipping corrupted line:', line);
            }
          }
        }

        logs.push(logEntry);

        await writeFile(logFile, JSON.stringify(logs, null, 2));
        return;
      } catch (error) {
        if (i === retries - 1) {
          console.error('Error writing to log file:', error);
        } else {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }
  } finally {
    releaseLock(logFile);
  }
};

/**
 * Starts the API monitoring server to log all API calls.
 *
 * @param {number} [port] - Optional port number. If not provided, a free port will be used.
 * @returns {Promise} Resolves to the running mock server.
 */
export const startApiMonitor = async (port) => {
  const mockServer = getLocal();
  port = port || (await portfinder.getPortPromise());

  const logFile = await createLogFile();
  console.log(`\n📝 Logging to file: ${path.resolve(logFile)}`);

  await mockServer.start(port);
  console.log(`\n🚀 API Monitor running at http://localhost:${port}\n`);

  await mockServer
    .forGet('/health-check')
    .thenReply(200, 'API Monitor is running');


  await mockServer
  .forPost('/track')
  .thenCallback(async (req) => {
    // Get and parse the request body
    const bodyText = await req.body.getText();
    let bodyJson;
    try {
      bodyJson = JSON.parse(bodyText);
      console.log('Received track request body:', bodyJson);
    } catch (e) {
      bodyJson = { raw: bodyText, error: 'Not valid JSON' };
      console.log('Received non-JSON track request body:', bodyText);
    }

    return {
      status: 200,
      json: bodyJson
    };
  });


  await mockServer.forUnmatchedRequest().thenPassThrough({
    beforeRequest: async ({ url, method, rawHeaders, requestBody }) => {
      const returnUrl = new URL(url).searchParams.get('url') || url;

      const requestLog = {
        timestamp: new Date().toISOString(),
        type: 'request',
        method,
        url: returnUrl,
        headers: rawHeaders || {},
      };

      if (requestBody) {
        try {
          const bodyText = await requestBody.getText();
          console.log('bodyText:', bodyText);
          try {
            requestLog.body = JSON.parse(bodyText);
          } catch (e) {
            requestLog.body = bodyText;
          }
        } catch (e) {
          console.error('Error reading request body:', e);
          requestLog.body = '[Error reading body]';
        }
      }

      // Console logging

      console.log(`\n📡 ${method} ${returnUrl}`);
      console.log('----------------------------------------');

      if (CONSOLE_LOG_CONFIG.showHeaders) {
        console.log('📡 Request Headers:');
        console.log('----------------------------------------');
        console.log(requestLog.headers);
        console.log('----------------------------------------');
      }

      if (requestBody && CONSOLE_LOG_CONFIG.showRequestBody) {
        console.log('\n📡 Request Body:');
        console.log('----------------------------------------');
        if (requestLog.body) {
          if (typeof requestLog.body === 'string') {
            console.log(requestLog.body);
          } else {
            console.log(JSON.stringify(requestLog.body, null, 2));
          }
        }
        console.log('----------------------------------------\n');
      }

      // Write request to log file
      await writeToLogFile(logFile, requestLog);

      return { url: returnUrl };
    },
    beforeResponse: async ({ statusCode, headers, body, statusMessage, }) => {
      try {
        const responseBody = await body.getText();
        let parsedBody = responseBody;

        try {
          parsedBody = JSON.parse(responseBody);
        } catch (e) {
          // Keep as raw text if not JSON
        }

        const responseLog = {
          timestamp: new Date().toISOString(),
          type: 'response',
          statusCode,
          statusMessage,
          headers: headers || {},
          body: parsedBody
        };

        // Write response to log file
        await writeToLogFile(logFile, responseLog);

        // Console logging
        if (CONSOLE_LOG_CONFIG.showResponseBody) {
          console.log('📥 Response Body:');
          console.log('----------------------------------------');
          if (typeof parsedBody === 'string') {
            console.log(parsedBody);
          } else {
            console.log(JSON.stringify(parsedBody, null, 2));
          }
          console.log('----------------------------------------\n');
        }
      } catch (e) {
        console.error('Error processing response:', e);
      }
    },
  });

  return mockServer;
};

/**
 * Stops the API monitoring server.
 *
 */
export const stopApiMonitor = async (mockServer) => {
  await mockServer.stop();
  console.log('🛑 API Monitor shutting down');
};
