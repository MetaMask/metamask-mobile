import AppwrightHelpers from '../../framework/AppwrightHelpers.ts';
import { test } from '../../framework/fixtures/performance/index.ts';

test('CHRIS:: Dummy test', async ({ device }) => {
  console.log(`[${new Date().toISOString()}] CHRIS:: Dummy test -> Go for it`);
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const webDriverClient = device.webDriverClient;

  await AppwrightHelpers.switchToWebViewContext(
    device,
    'http://bs-local.com:5173',
  );

  // Inject console interceptor that persists across same-origin refreshes via sessionStorage
  await webDriverClient.executeScript(
    `
    if (!window.__consoleInterceptorActive) {
      window.__consoleInterceptorActive = true;
      window.__consoleLogs = JSON.parse(sessionStorage.getItem('__consoleLogs') || '[]');
      ['log', 'warn', 'error', 'info', 'debug'].forEach(function(method) {
        var orig = console[method];
        console[method] = function() {
          var args = Array.prototype.slice.call(arguments);
          var entry = { method: method, args: args.map(String), ts: Date.now() };
          window.__consoleLogs.push(entry);
          try { sessionStorage.setItem('__consoleLogs', JSON.stringify(window.__consoleLogs)); } catch(e) {}
          orig.apply(console, args);
        };
      });
    }
  `,
    [],
  );
  console.log(
    `[${new Date().toISOString()}] CHRIS:: Console interceptor injected`,
  );

  // Wait and let the web app produce logs
  const minsToWait = 2;
  for (let i = 1; i <= minsToWait; i++) {
    // Send periodic commands to keep session alive
    for (let sec = 0; sec < 60; sec += 30) {
      await new Promise((resolve) => setTimeout(resolve, 30 * 1000));
      await webDriverClient.getTitle(); // keepalive
    }
    console.log(
      `[${new Date().toISOString()}] CHRIS:: ${i} of ${minsToWait} minutes elapsed`,
    );
  }

  // Retrieve captured browser console logs
  console.log(`[${new Date().toISOString()}] CHRIS:: GETTING BROWSER LOGS NOW`);
  const logs = await webDriverClient.executeScript(
    'return window.__consoleLogs',
    [],
  );
  console.log(
    `[${new Date().toISOString()}] CHRIS:: Browser console logs:`,
    JSON.stringify(logs, null, 2),
  );

  // Switch back to native context
  await AppwrightHelpers.switchToNativeContext(device);
  console.log(`[${new Date().toISOString()}] CHRIS:: Dummy test -> FINISHED`);
});
