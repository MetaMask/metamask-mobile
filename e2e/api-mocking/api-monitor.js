/* eslint-disable no-console */
import { getLocal } from 'mockttp';
import portfinder from 'portfinder';
import fs from 'fs';
import path from 'path';

const LOGS_DIR = 'api-monitor-logs';

/**
 * Creates a new log file name with timestamp
 * @returns {string} The log file path
 */
const createLogFile = () => {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }

  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '-')
    .replace('Z', '');
  
  const logFile = path.join(LOGS_DIR, `api-monitor-${timestamp}.json`);
  fs.writeFileSync(logFile, '[]');
  return logFile;
};

/**
 * Write log entry to JSON file
 * @param {string} logFile - The path to the log file
 * @param {Object} logEntry - The log entry to write
 */
const writeToLogFile = (logFile, logEntry) => {
  try {
    let logs = [];
    if (fs.existsSync(logFile)) {
      const fileContent = fs.readFileSync(logFile, 'utf8');
      logs = JSON.parse(fileContent);
    }
    logs.push(logEntry);
    fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
  } catch (error) {
    console.error('Error writing to log file:', error);
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

  const logFile = createLogFile();
  console.log(`\n📝 Logging to file: ${path.resolve(logFile)}`);

  await mockServer.start(port);
  console.log(`\n🚀 API Monitor running at http://localhost:${port}\n`);

  await mockServer
    .forGet('/health-check')
    .thenReply(200, 'API Monitor is running');

  let currentRequest = null;

  await mockServer.forUnmatchedRequest().thenPassThrough({
    beforeRequest: async ({ url, method, rawHeaders, requestBody }) => {
      const returnUrl = new URL(url).searchParams.get('url') || url;
      
      // TODO: find a way to get the platform from the app
      const platform = 'ios';
      const updatedUrl =
        platform === 'android'
          ? returnUrl.replace('localhost', '127.0.0.1')
          : returnUrl;
      
      currentRequest = {
        timestamp: new Date().toISOString(),
        request: {
          method,
          url: updatedUrl,
          headers: rawHeaders || {},
        }
      };

      if (requestBody) {
        try {
          const body = await requestBody.getJson();
          currentRequest.request.body = body;
        } catch (e) {
          const textBody = await requestBody.getText();
          currentRequest.request.body = textBody;
        }
      }

      console.log('\n📡 API Request:');
      console.log('----------------------------------------');
      console.log(`Method: ${method}`);
      console.log(`URL: ${updatedUrl}`);
      
      if (rawHeaders) {
        console.log('\nHeaders:');
        console.log(JSON.stringify(rawHeaders, null, 2));
      }

      if (requestBody) {
        try {
          const body = await requestBody.getJson();
          console.log('\nRequest Body:');
          console.log(JSON.stringify(body, null, 2));
        } catch (e) {
          console.log('\nRequest Body: (Raw)');
          console.log(await requestBody.getText());
        }
      }
      console.log('----------------------------------------\n');

      return { url: updatedUrl };
    },
    beforeResponse: async ({ statusCode, headers, body, statusMessage }) => {
      console.log('📥 API Response:');
      console.log('----------------------------------------');
      console.log(`Status: ${statusCode} ${statusMessage}`);
      
      if (headers) {
        console.log('\nHeaders:');
        console.log(JSON.stringify(headers, null, 2));
      }

      try {
        const responseBody = await body.getText();
        let parsedBody = responseBody;

        try {
          parsedBody = JSON.parse(responseBody);
          console.log('\nResponse Body:');
          console.log(JSON.stringify(parsedBody, null, 2));
        } catch (e) {
          console.log('\nResponse Body:');
          console.log(responseBody);
        }

        if (currentRequest) {
          currentRequest.response = {
            statusCode,
            statusMessage,
            headers: headers || {},
            body: parsedBody
          };
          writeToLogFile(logFile, currentRequest);
          currentRequest = null;
        }
      } catch (e) {
        console.log('\nResponse Body Error:');
        console.log(e);
        
        if (currentRequest) {
          currentRequest.response = {
            statusCode,
            statusMessage,
            headers: headers || {},
            error: e.message
          };
          writeToLogFile(logFile, currentRequest);
          currentRequest = null;
        }
      }
      console.log('----------------------------------------\n');
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