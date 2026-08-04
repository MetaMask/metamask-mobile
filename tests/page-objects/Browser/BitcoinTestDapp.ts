import ChromeCdpHelpers from '../../framework/ChromeCdpHelpers.js';
import {
  loginToAppPlaywright,
  dismissPushNotificationExistingUserSheet,
} from '../../flows/wallet.flow.js';
import { navigateToBrowserView } from '../../flows/browser.flow.js';
import BrowserView from './BrowserView.js';
import DappConnectionModal from '../MMConnect/DappConnectionModal.js';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import PlaywrightGestures from '../../framework/PlaywrightGestures';

export const BITCOIN_DAPP_PORT = 8094;
const BASE_URL = `http://localhost:${BITCOIN_DAPP_PORT}`;

const DAPP_LOAD_TIMEOUT_MS = 30_000;
const CONNECT_TIMEOUT_MS = 30_000;
const CLICK_TIMEOUT_MS = 15_000;
const POLL_MS = 300;

// data-testid values from @metamask/test-dapp-bitcoin
const TESTIDS = {
  CONNECT: 'testpage.header.connect',
  DISCONNECT: 'testpage.header.disconnect',
  CONNECTION_STATUS: 'testpage.header.connectionstatus',
  ACCOUNT: 'testpage.header.account',
  WALLET_OPTION: 'testpage.walletselectionmodal.walletoption',
  STANDARD_BUTTON: 'testpage.walletselectionmodal.standardbutton',
  SIGN_MESSAGE_BUTTON: 'testpage.signmessage.signmessage',
  SIGNED_MESSAGE: 'testpage.signmessage.signedmessage',
} as const;

function sel(testId: string): string {
  return `[data-testid="${testId}"]`;
}

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

class BitcoinTestDapp {
  async setupAndNavigate(): Promise<void> {
    ChromeCdpHelpers.resetMetaMaskWebViewCache();
    await loginToAppPlaywright({ scenarioType: 'e2e' });
    await navigateToBrowserView();
    await dismissPushNotificationExistingUserSheet();
    await BrowserView.tapUrlInputBox();
    await BrowserView.navigateToURL(BASE_URL);
    await this.waitForDappLoaded();
  }

  private async evaluate<T>(expression: string): Promise<T | null> {
    return ChromeCdpHelpers.evaluateInWebView<T>(BASE_URL, expression);
  }

  /** Waits until the dapp header has rendered (connection status is readable). */
  private async waitForDappLoaded(
    timeoutMs = DAPP_LOAD_TIMEOUT_MS,
  ): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const text = await this.evaluate<string>(
        `document.querySelector(${JSON.stringify(sel(TESTIDS.CONNECTION_STATUS))})?.textContent?.trim() || null`,
      ).catch(() => null);
      if (text) return;
      await wait(POLL_MS);
    }
    throw new Error(
      `Timed out waiting for Bitcoin test dapp to load within ${timeoutMs}ms`,
    );
  }

  private async waitForElement(
    cssSelector: string,
    timeoutMs = 10_000,
  ): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const exists = await this.evaluate<boolean>(
        `Boolean(document.querySelector(${JSON.stringify(cssSelector)}))`,
      );
      if (exists) return;
      await wait(POLL_MS);
    }
    throw new Error(`Timed out waiting for "${cssSelector}" to appear`);
  }

  private async click(
    cssSelector: string,
    timeoutMs = CLICK_TIMEOUT_MS,
  ): Promise<void> {
    await this.waitForElement(cssSelector, timeoutMs);
    const clicked = await this.evaluate<boolean>(
      `(() => {
        const el = document.querySelector(${JSON.stringify(cssSelector)});
        if (!el) return false;
        el.click();
        return true;
      })()`,
    );
    if (!clicked) {
      throw new Error(`Element not found in WebView: ${cssSelector}`);
    }
  }

  private async pollForText(
    cssSelector: string,
    expected: string,
    timeoutMs = 10_000,
  ): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    let actual: string | null = null;
    while (Date.now() < deadline) {
      actual = await this.evaluate<string>(
        `document.querySelector(${JSON.stringify(cssSelector)})?.textContent?.trim() || null`,
      ).catch(() => null);
      if (actual === expected) return;
      await wait(500);
    }
    throw new Error(`Timed out: expected "${expected}", got "${actual}"`);
  }

  async connect(): Promise<void> {
    await this.click(`button${sel(TESTIDS.CONNECT)}`);
    await this.waitForElement(`button${sel(TESTIDS.WALLET_OPTION)}`);
    await this.click(`button${sel(TESTIDS.WALLET_OPTION)}`);
    await this.click(`button${sel(TESTIDS.STANDARD_BUTTON)}`);
    await DappConnectionModal.tapConnectButton({ timeout: 15_000 });
    await this.verifyConnectionStatus('Connected', CONNECT_TIMEOUT_MS);
  }

  async disconnect(): Promise<void> {
    await this.click(`button${sel(TESTIDS.DISCONNECT)}`);
  }

  async verifyConnectionStatus(
    expected: string,
    timeoutMs = 10_000,
  ): Promise<void> {
    await this.pollForText(sel(TESTIDS.CONNECTION_STATUS), expected, timeoutMs);
  }

  async verifyAccount(expected: string, timeoutMs = 10_000): Promise<void> {
    await this.pollForText(`${sel(TESTIDS.ACCOUNT)} a`, expected, timeoutMs);
  }

  async signMessage(): Promise<void> {
    await this.click(`button${sel(TESTIDS.SIGN_MESSAGE_BUTTON)}`);
  }

  async confirmSignMessage(): Promise<void> {
    const el = await PlaywrightMatchers.getElementByText('Approve', true);
    await PlaywrightGestures.waitAndTap(el, {
      checkForDisplayed: true,
      timeout: 15_000,
    });
  }

  async verifySignedMessage(
    expected: string,
    timeoutMs = 15_000,
  ): Promise<void> {
    await this.pollForText(sel(TESTIDS.SIGNED_MESSAGE), expected, timeoutMs);
  }

  async reload(): Promise<void> {
    ChromeCdpHelpers.resetMetaMaskWebViewCache();
    await BrowserView.tapUrlInputBox();
    await BrowserView.navigateToURL(BASE_URL);
    await this.waitForDappLoaded();
    // Wait for the snap to restore the connection before returning so that
    // subsequent verifyAccount / verifyConnectionStatus calls don't race.
    await this.pollForText(
      sel(TESTIDS.CONNECTION_STATUS),
      'Connected',
      CONNECT_TIMEOUT_MS,
    );
  }
}

export default new BitcoinTestDapp();
