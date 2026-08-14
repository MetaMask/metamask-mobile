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
import { dataTestIds } from '@metamask/test-dapp-bitcoin';

export const BITCOIN_DAPP_PORT = 8094;
const BASE_URL = `http://localhost:${BITCOIN_DAPP_PORT}`;

const DAPP_LOAD_TIMEOUT_MS = 30_000;
const CONNECT_TIMEOUT_MS = 30_000;
const CLICK_TIMEOUT_MS = 15_000;
const POLL_MS = 300;

const { header, walletSelectionModal, signMessage } = dataTestIds.testPage;

function sel(testId: string): string {
  return `[data-testid="${testId}"]`;
}

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

class BitcoinTestDapp {
  private async getConnectionStatus(): Promise<string | null> {
    return this.evaluate<string>(
      `document.querySelector(${JSON.stringify(sel(header.connectionStatus))})?.textContent?.trim() || null`,
    ).catch(() => null);
  }

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
      const text = await this.getConnectionStatus();
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
      await wait(POLL_MS);
    }
    throw new Error(`Timed out: expected "${expected}", got "${actual}"`);
  }

  /**
   * After reload, the dapp may auto-reconnect (status → Connected) or re-open
   * the MetaMask connect sheet. Poll for Connected and periodically approve
   * the sheet if it appears (CI Android often needs this).
   */
  private async waitForReconnect(
    timeoutMs = CONNECT_TIMEOUT_MS,
  ): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    let lastConnectAttemptAt = 0;
    let actual: string | null = null;

    while (Date.now() < deadline) {
      actual = await this.getConnectionStatus();
      if (actual === 'Connected') return;

      // Auto-reconnect may re-open the MetaMask connect sheet after wallets register.
      if (Date.now() - lastConnectAttemptAt >= 3_000) {
        lastConnectAttemptAt = Date.now();
        try {
          await DappConnectionModal.tapConnectButton({ timeout: 1_000 });
        } catch {
          // Connect sheet not shown yet.
        }
      }

      await wait(POLL_MS);
    }

    throw new Error(
      `Timed out waiting for reconnect: expected "Connected", got "${actual}"`,
    );
  }

  /**
   * Reloads the Bitcoin test dapp and waits for the header. Does not approve a
   * reconnect sheet — callers that need that should use {@link reload}.
   */
  private async reloadDapp(): Promise<void> {
    // IIFE: iOS evaluateInWebView wraps as `return (${expression})`.
    await this.evaluate('(() => { location.reload(); return true; })()');
    ChromeCdpHelpers.resetMetaMaskWebViewCache();
    await this.waitForDappLoaded();
  }

  private async isElementPresent(
    cssSelector: string,
    timeoutMs = 10_000,
  ): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const exists = await this.evaluate<boolean>(
        `Boolean(document.querySelector(${JSON.stringify(cssSelector)}))`,
      ).catch(() => false);
      if (exists) return true;
      await wait(POLL_MS);
    }
    return false;
  }

  /**
   * Opens the wallet-selection modal. On Android CI the Bitcoin provider can
   * register after test-dapp-bitcoin's one-shot mount effect, leaving
   * wallets=[] ("No wallet available") until reload. One reload + reconnect
   * recovers that race; re-tapping Connect alone cannot.
   */
  private async openWalletSelectionModal(): Promise<void> {
    const walletOptionSelector = `button${sel(
      walletSelectionModal.walletOption,
    )}`;
    const connectSelector = `button${sel(header.connect)}`;

    await this.click(connectSelector);
    if (await this.isElementPresent(walletOptionSelector, 10_000)) {
      return;
    }

    await this.reloadDapp();
    await this.click(connectSelector);
    await this.waitForElement(walletOptionSelector, CONNECT_TIMEOUT_MS);
  }

  async connect(): Promise<void> {
    await this.openWalletSelectionModal();
    await this.click(`button${sel(walletSelectionModal.walletOption)}`);
    await this.click(`button${sel(walletSelectionModal.standardButton)}`);
    await DappConnectionModal.tapConnectButton({ timeout: 15_000 });
    await this.verifyConnectionStatus('Connected', CONNECT_TIMEOUT_MS);
  }

  async disconnect(): Promise<void> {
    await this.click(`button${sel(header.disconnect)}`);
  }

  async verifyConnectionStatus(
    expected: string,
    timeoutMs = 10_000,
  ): Promise<void> {
    await this.pollForText(sel(header.connectionStatus), expected, timeoutMs);
  }

  async verifyAccount(expected: string, timeoutMs = 10_000): Promise<void> {
    await this.pollForText(`${sel(header.account)} a`, expected, timeoutMs);
  }

  async signMessage(): Promise<void> {
    await this.click(`button${sel(signMessage.signMessage)}`);
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
    await this.pollForText(sel(signMessage.signedMessage), expected, timeoutMs);
  }

  async reload(): Promise<void> {
    await this.reloadDapp();
    await this.waitForReconnect();
  }
}

export default new BitcoinTestDapp();
