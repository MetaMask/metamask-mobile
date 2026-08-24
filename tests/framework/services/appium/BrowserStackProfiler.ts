const BROWSERSTACK_SHAKE_COMMAND =
  'browserstack_executor: {"action":"customGesture","arguments":{"deviceShake":"true"}}';
const PROFILER_TIMEOUT_MS = 30_000;

export async function shakeBrowserStackDevice(
  driver: WebdriverIO.Browser,
): Promise<void> {
  await driver.execute(BROWSERSTACK_SHAKE_COMMAND);
}

export async function startBrowserStackProfiler(
  driver: WebdriverIO.Browser,
): Promise<void> {
  await shakeBrowserStackDevice(driver);
  const startButton = await driver.$('~profiler-start-button');
  await startButton.waitForDisplayed({ timeout: PROFILER_TIMEOUT_MS });
  await startButton.click();
}

export async function stopBrowserStackProfiler(
  driver: WebdriverIO.Browser,
): Promise<void> {
  await shakeBrowserStackDevice(driver);
  const stopButton = await driver.$('~profiler-stop-button');
  await stopButton.waitForDisplayed({ timeout: PROFILER_TIMEOUT_MS });
  await stopButton.click();

  const startButton = await driver.$('~profiler-start-button');
  await startButton.waitForDisplayed({ timeout: PROFILER_TIMEOUT_MS });
}
