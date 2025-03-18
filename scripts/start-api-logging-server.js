/* eslint-disable no-console */
import { startApiMonitor, stopApiMonitor } from '../e2e/api-mocking/api-monitor';
import { defaultMockPort } from '../e2e/api-mocking/mock-config/mockUrlCollection.json';

/**
 * This script starts a mock server to log API calls.
 * It doesn't mock any responses, just logs the requests.
 */
const startApiLoggingServer = async () => {
  console.log('Starting API Logging Server...');
  console.log(`Using port: ${defaultMockPort}`);
  
  try {
    const monitor = await startApiMonitor(defaultMockPort);
    
    console.log('\n===========================================');
    console.log('✅ API Logging Server started successfully');
    console.log(`Server is running at http://localhost:${defaultMockPort}`);
    console.log('API calls will be logged to the console');
    console.log('===========================================\n');
    
    process.on('SIGINT', async () => {
      console.log('\nShutting down API Logging Server...');
      await stopApiMonitor(monitor);
      process.exit(0);
    });

    process.on('uncaughtException', async (error) => {
      console.error('Error:', error);
      await stopApiMonitor(monitor);
      process.exit(1);
    });
  } catch (error) {
    console.error('Failed to start API Monitor:', error);
    process.exit(1);
  }
};

startApiLoggingServer(); 