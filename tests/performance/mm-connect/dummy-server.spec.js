import AppwrightHelpers from '../../framework/AppwrightHelpers.ts';
import { test } from '../../framework/fixtures/performance/index.ts';
import CommandQueueServer from '../../framework/fixtures/CommandQueueServer.ts';
import { waitForDappServerReady } from './utils.js';

const commandQueueServer = new CommandQueueServer();
const SERVER_PORT = 2446;

test.beforeAll(async () => {
  commandQueueServer.setServerPort(SERVER_PORT);
  await commandQueueServer.start();
  await waitForDappServerReady(SERVER_PORT);
});

test.afterAll(async () => {
  // await commandQueueServer.stop();
});

test('CHRIS:: Dummy test - Server', async ({ device }) => {
  console.log(`[${new Date().toISOString()}] CHRIS:: Dummy test -> Go for it`);
  await new Promise((resolve) => setTimeout(resolve, 5000));

  await AppwrightHelpers.switchToWebViewContext(
    device,
    'http://bs-local.com:5173',
  );

  console.log('CHRIS:: Waiting for 5 seconds - 1');
  await new Promise((resolve) => setTimeout(resolve, 5000));

  console.log('CHRIS:: Waiting for 5 seconds - 2');
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Fetching logs the dapp sent
  console.log('CHRIS:: Fetching logs the dapp sent');
  const logs = await commandQueueServer.getMMConnectDebugLogs();
  console.log('CHRIS:: Logs:', logs);
});
