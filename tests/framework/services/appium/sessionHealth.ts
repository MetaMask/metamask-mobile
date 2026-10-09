/**
 * Cheap liveness check for a reused Appium/WDIO session.
 * Prefer getWindowSize over getSession — it exercises the session without
 * depending on provider-specific session APIs.
 */
export async function isSessionAlive(
  drv: WebdriverIO.Browser | undefined,
): Promise<boolean> {
  if (!drv) {
    return false;
  }

  try {
    await drv.getWindowSize();
    return true;
  } catch {
    return false;
  }
}

/**
 * Best-effort reset to the native app context after WebView / browser work.
 * Soft reload must not leave a stale WEBVIEW context on a reused session.
 */
export async function switchToNativeContext(
  drv: WebdriverIO.Browser | undefined,
): Promise<boolean> {
  if (!drv || typeof drv.switchContext !== 'function') {
    return false;
  }

  try {
    await drv.switchContext('NATIVE_APP');
    return true;
  } catch {
    return false;
  }
}
