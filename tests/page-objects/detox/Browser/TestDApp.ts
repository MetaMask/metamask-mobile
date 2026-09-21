import Matchers from '../../../framework/detox/Matchers';
import Utilities from '../../../framework/detox/Utilities';
import { createLogger } from '../../../framework/logger';
import { TestDappSelectorsWebIDs } from '../../../selectors/Browser/TestDapp.selectors';
import { BrowserViewSelectorsIDs } from '../../../../app/components/Views/BrowserTab/BrowserView.testIds';

const logger = createLogger({ name: 'TestDApp' });

// Result element ids rendered by @metamask/test-dapp (dist/main.js):
// personal_sign fills #personalSignResult and signTypedData_v4 fills
// #signTypedDataV4Result with the returned 0x signature. (The
// 'personalSignResult' id also appears in
// tests/selectors/Browser/TestSnaps.selectors.ts.)
const PERSONAL_SIGN_RESULT_WEB_ID = 'personalSignResult';
const SIGN_TYPED_DATA_V4_RESULT_WEB_ID = 'signTypedDataV4Result';
// Header element written by the dapp's updateCurrentNetworkDisplay
// (dist/main.js): it renders "Current Network: Not Connected" exactly when
// the page-init eth_chainId has not populated src.chainIdInt.
const CURRENT_NETWORK_NAME_WEB_ID = 'currentNetworkName';

/**
 * Detox-native page object for the Test Dapp WebView.
 *
 * Detox-world twin of the Appium `tests/page-objects/Browser/TestDApp.ts`:
 * elements are resolved through the Detox web-element API
 * (`Matchers.getElementByWebID` → `web(by.id(...))`) instead of the Appium
 * driver, which is not available under Detox.
 */
class TestDApp {
  get testDappFoxLogo(): WebElement {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.TEST_DAPP_FOX_LOGO,
    );
  }

  get testDappPageTitle(): WebElement {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.TEST_DAPP_HEADING_TITLE,
    );
  }

  get DappConnectButton(): WebElement {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.CONNECT_BUTTON,
    );
  }

  get personalSignButton(): WebElement {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.PERSONAL_SIGN,
    );
  }

  get signTypedDataV4Button(): WebElement {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.SIGN_TYPE_DATA_V4,
    );
  }

  get sendEIP1559Button(): WebElement {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.SEND_EIP_1559_BUTTON_ID,
    );
  }

  get personalSignResult(): WebElement {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      PERSONAL_SIGN_RESULT_WEB_ID,
    );
  }

  get signTypedDataV4Result(): WebElement {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      SIGN_TYPED_DATA_V4_RESULT_WEB_ID,
    );
  }

  get requestResultMain(): Promise<Detox.IndexableWebElement> {
    return Matchers.getElementByCSS(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      'main',
    );
  }

  get currentNetworkName(): WebElement {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      CURRENT_NETWORK_NAME_WEB_ID,
    );
  }

  /**
   * Reads the `/request` page's `<main>` text in a single poll. Used to
   * detect the page's provider race: it renders "Provider not found" when
   * window.ethereum was not injected at auto-fire time (run23).
   */
  async getRequestPageText(): Promise<string> {
    const webElement = (await this.requestResultMain) as IndexableWebElement;
    return String(await webElement.runScript('(el) => el.textContent'));
  }

  /**
   * Waits until the test dapp's page-init `eth_chainId` has populated
   * `chainIdInt`. The dapp renders "Current Network: Not Connected" in
   * `#currentNetworkName` exactly when it is unset, and
   * `signTypedDataV4.onclick` reads `chainIdInt` BEFORE its try block — so
   * tapping V4 on an uninitialized page throws synchronously and no request
   * ever reaches the wallet (runs 23/33/34: no sheet, empty Result).
   *
   * Healthy = the element's text does NOT contain "not connected"
   * (case-insensitive), polled over a ~10s window per attempt (same
   * web-text polling idiom as {@link waitForDappResultText}). On a miss,
   * `reload` is invoked — a fresh page load re-runs the dapp's init — and
   * the check repeats up to `maxAttempts`; exhaustion throws naming the
   * root cause. The reload is a spec-provided callback because the flow
   * helpers import this page object (a PO → flow import would cycle).
   *
   * @param reload - Re-opens the dapp root (fresh page load) between attempts.
   * @param maxAttempts - Max health-check attempts (default 3).
   */
  async waitForDappChainIdReady(
    reload: () => Promise<void>,
    maxAttempts = 3,
  ): Promise<void> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const networkText = await Utilities.executeWithRetry(
        async () => {
          const webElement = (await this
            .currentNetworkName) as IndexableWebElement;
          const text = String(
            await webElement.runScript('(el) => el.textContent'),
          );
          if (text.toLowerCase().includes('not connected')) {
            throw new Error(`chainIdInt not populated yet; text: "${text}"`);
          }
          return text;
        },
        {
          timeout: 10000,
          description: 'dapp chainId readiness probe',
          elemDescription: CURRENT_NETWORK_NAME_WEB_ID,
        },
      ).catch(() => undefined);

      if (networkText !== undefined) {
        logger.debug(`✅ Dapp chainId ready: ${networkText}`);
        return;
      }

      logger.warn(
        `waitForDappChainIdReady: dapp still "Not Connected" (attempt ${attempt}/${maxAttempts}); reloading page to re-run dapp init`,
      );
      if (attempt < maxAttempts) {
        await reload();
      }
    }
    throw new Error(
      'Test dapp init race: chainIdInt was never populated (page-init eth_chainId lost the provider bridge race), so signTypedData_v4 would throw before sending any request',
    );
  }

  /**
   * Waits for a WebView button to exist, scrolls it into view and taps it.
   *
   * Detox web `tap()` does not auto-scroll and the WebDriver atom behind it
   * refuses to manipulate elements outside the viewport ("Element is not
   * currently visible and may not be manipulated"), so buttons below the
   * fold need an explicit scroll first. `scrollToView()` is the official
   * API but can silently no-op when the atom cannot reach the scroller, so
   * it is wrapped in try/catch and backed by a `scrollIntoView` script,
   * which also works while the element is off-screen.
   *
   * Native readiness helpers (`Gestures.waitAndTap`) are deliberately not
   * used here: their native visibility checks fail for below-fold WebView
   * elements even though a scroll + tap would succeed.
   *
   * @param elem - The WebView element (or promise of it) to tap.
   * @param description - Human-readable element description used for logging.
   */
  private async tapWebButton(
    elem: Promise<WebElement> | WebElement,
    description: string,
  ): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        const webElement = (await elem) as IndexableWebElement;

        // Wait for the element to exist in the WebView DOM. Detox's typed
        // `expect` supports web elements (`WebExpect.toExist()`); the
        // generous timeout and polling are provided by executeWithRetry.
        await expect(webElement).toExist();

        // Best-effort official scroll API — may silently no-op.
        try {
          await webElement.scrollToView();
        } catch {
          // Ignored — the scrollIntoView fallback below handles scrolling.
        }

        // Reliable fallback: scrollIntoView works even while off-screen.
        try {
          await webElement.runScript(
            '(el) => el.scrollIntoView({ block: "center" })',
          );
        } catch (error) {
          logger.warn(
            `⚠️ scrollIntoView fallback failed for "${description}": ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          );
        }

        await webElement.tap();
      },
      {
        timeout: 20000,
        description: 'tapWebButton()',
        elemDescription: description,
      },
    );
    logger.debug(`✅ Successfully tapped element: ${description}`);
  }

  async tapPersonalSignButton(): Promise<void> {
    await this.tapWebButton(this.personalSignButton, 'Personal sign button');
  }

  async tapTypedV4SignButton(): Promise<void> {
    await this.tapWebButton(this.signTypedDataV4Button, 'Typed V4 sign button');
  }

  /**
   * Taps the "Send EIP-1559 Transaction" button.
   * The button may sit below the fold in the WebView, so it is scrolled
   * into view before being tapped.
   */
  async tapSendEIP1559Button(): Promise<void> {
    await this.tapWebButton(
      this.sendEIP1559Button,
      'Send EIP1559 Transaction Button',
    );
  }

  async connect(): Promise<void> {
    await this.tapWebButton(this.DappConnectButton, 'Dapp connect button');
  }

  /**
   * Polls the given Test Dapp result element until its text matches
   * `pattern`. The dapp fills its result element only after the wallet
   * resolves the request (e.g. with the 0x signature / transaction hash),
   * so this is the end-to-end signing oracle.
   *
   * Detox web expectations are point-in-time (no `withTimeout`), so the
   * retry loop is provided by `Utilities.executeWithRetry`, consistent with
   * {@link tapWebButton}.
   *
   * @param elem - The WebView result element (or promise of it).
   * @param pattern - Regex the element's textContent must match.
   * @param description - Human-readable description used for logging.
   * @param timeoutMs - Max time to wait for the result (default 90000).
   */
  private async waitForDappResultText(
    elem: Promise<WebElement> | WebElement,
    pattern: RegExp,
    description: string,
    timeoutMs = 90000,
  ): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        const webElement = (await elem) as IndexableWebElement;
        const text = String(
          await webElement.runScript('(el) => el.textContent'),
        );
        if (!pattern.test(text)) {
          throw new Error(
            `Dapp result not ready for "${description}"; current text: "${text.slice(0, 120)}"`,
          );
        }
      },
      {
        timeout: timeoutMs,
        description: 'waitForDappResultText()',
        elemDescription: description,
      },
    );
    logger.debug(`✅ Dapp result confirmed: ${description}`);
  }

  /**
   * Waits for the personal_sign result in the dapp's result area: the dapp
   * renders the returned 0x… signature. Hard oracle: end-to-end signing
   * must have completed.
   *
   * @param timeoutMs - Max time to wait for the signature (default 90000).
   */
  async waitForPersonalSignResult(timeoutMs = 90000): Promise<void> {
    await this.waitForDappResultText(
      this.personalSignResult,
      /^0x[0-9a-fA-F]{8,}/,
      'personal_sign result (0x signature)',
      timeoutMs,
    );
  }

  /**
   * Waits for the signTypedData_v4 result in the dapp's result area: the
   * dapp renders the returned 0x… signature. Hard oracle: end-to-end
   * signing must have completed.
   *
   * @param timeoutMs - Max time to wait for the signature (default 90000).
   */
  async waitForSignTypedDataV4Result(timeoutMs = 90000): Promise<void> {
    await this.waitForDappResultText(
      this.signTypedDataV4Result,
      /^0x[0-9a-fA-F]{8,}/,
      'signTypedData_v4 result (0x signature)',
      timeoutMs,
    );
  }

  /**
   * Waits for the result of a dapp request fired via the `/request` page
   * (e.g. the auto-request eth_sendTransaction route): the page sets its
   * `<main>` text to `Response: <result>` once the wallet resolves — the
   * transaction hash for eth_sendTransaction. Hard oracle: end-to-end
   * signing must have completed.
   *
   * @param timeoutMs - Max time to wait for the response (default 90000).
   */
  async waitForTransactionRequestResult(timeoutMs = 90000): Promise<void> {
    await this.waitForDappResultText(
      this.requestResultMain,
      /^Response: "?0x[0-9a-fA-F]{8,}/,
      'transaction request result (Response: 0x hash)',
      timeoutMs,
    );
  }
}

export default new TestDApp();
