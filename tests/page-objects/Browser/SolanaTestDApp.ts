import ChromeCdpHelpers from '../../framework/ChromeCdpHelpers.js';
import {
  loginToAppPlaywright,
  dismissPushNotificationExistingUserSheet,
} from '../../flows/wallet.flow.js';
import { navigateToBrowserView } from '../../flows/browser.flow.js';
import BrowserView from './BrowserView.js';
import DappConnectionModal from '../MMConnect/DappConnectionModal.js';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import { PlatformDetector } from '../../framework/PlatformLocator';
import type { AppiumElement } from '../../framework';
import { SolanaTestDappSelectorsWebIDs } from '../../selectors/Browser/SolanaTestDapp.selectors.js';
import { dataTestIds } from '@metamask/test-dapp-solana';

export const SOLANA_DAPP_PORT = 8095;
const BASE_URL = `http://localhost:${SOLANA_DAPP_PORT}`;

const DAPP_LOAD_TIMEOUT_MS = 30_000;
const CONNECT_TIMEOUT_MS = 30_000;
const CLICK_TIMEOUT_MS = 15_000;
const POLL_MS = 300;

const { header, signMessage, sendSol } = dataTestIds.testPage;

function sel(testId: string): string {
  return `[data-testid="${testId}"]`;
}

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

class SolanaTestDApp {
  /** Exact native text match via XPath (name/label/text/content-desc). */
  private getExactTextElement(text: string): Promise<AppiumElement> {
    const escaped = text.replace(/'/g, "\\'");
    if (PlatformDetector.isAndroid()) {
      return Matchers.getElementByNativeXPath(
        `//*[@name='${escaped}' or @label='${escaped}' or @text='${escaped}' or @content-desc='${escaped}']`,
      );
    }
    return Matchers.getElementByNativeXPath(
      `//*[@name='${escaped}' or @label='${escaped}' or @text='${escaped}']`,
    );
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
      const text = await this.evaluate<string>(
        `document.querySelector(${JSON.stringify(sel(header.connectionStatus))})?.textContent?.trim() || null`,
      ).catch(() => null);
      if (text) return;
      await wait(POLL_MS);
    }
    throw new Error(
      `Timed out waiting for Solana test dapp to load within ${timeoutMs}ms`,
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

  // Connect button has structure <div data-testid="..."><div><button/></div></div>
  async clickConnectButton(): Promise<void> {
    await this.click(`${sel(header.connect)} button`);
  }

  // MetaMask wallet option is inside the Solana wallet adapter modal (CSS class)
  async selectMetaMaskWallet(): Promise<void> {
    await this.waitForElement(SolanaTestDappSelectorsWebIDs.WALLET_BUTTON);
    await this.click(SolanaTestDappSelectorsWebIDs.WALLET_BUTTON);
  }

  /**
   * Detect whether MetaMask's Solana wallet-standard provider has registered
   * in the page via the app-ready / register-wallet handshake.
   */
  private async isSolanaWalletRegistered(): Promise<boolean> {
    const count = await this.evaluate<number>(
      `(() => {
        let n = 0;
        const handler = (event) => {
          try {
            event.detail.callback({ register() { n += 1; } });
          } catch (_) {}
        };
        window.addEventListener('wallet-standard:register-wallet', handler);
        try {
          window.dispatchEvent(new Event('wallet-standard:app-ready'));
        } catch (_) {}
        window.removeEventListener('wallet-standard:register-wallet', handler);
        return n;
      })()`,
    );
    return (count ?? 0) > 0;
  }

  /**
   * Poll until the Solana wallet-standard provider registers, or the timeout
   * elapses. Returns whether registration was observed (does not throw — the
   * Connect recovery loop still retries after reload).
   */
  private async waitForSolanaWalletRegistered(
    timeoutMs = 10_000,
  ): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (await this.isSolanaWalletRegistered()) {
        return true;
      }
      await wait(POLL_MS);
    }
    return false;
  }

  /**
   * Reload the Solana test dapp and wait for the header. Does not require
   * Connected — used between connect recovery attempts.
   */
  private async reloadDapp(): Promise<void> {
    await this.evaluate('(() => { location.reload(); return true; })()');
    ChromeCdpHelpers.resetMetaMaskWebViewCache();
    await this.waitForDappLoaded();
  }

  /**
   * Single connect attempt: open wallet adapter, pick MetaMask, approve the
   * native permission sheet.
   */
  private async attemptConnect(): Promise<void> {
    await this.clickConnectButton();
    await this.selectMetaMaskWallet();
    await DappConnectionModal.tapConnectButton({ timeout: 15_000 });
  }

  /**
   * Poll for Connected without throwing — used by the connect recovery loop.
   */
  private async isConnectionStatus(
    expected: string,
    timeoutMs: number,
  ): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const actual = await this.evaluate<string>(
        `document.querySelector(${JSON.stringify(
          sel(header.connectionStatus),
        )})?.textContent?.trim() || null`,
      ).catch(() => null);
      if (actual === expected) {
        return true;
      }
      await wait(POLL_MS);
    }
    return false;
  }

  /**
   * Connect to MetaMask via the Solana wallet adapter.
   *
   * On iOS CI the wallet-standard provider can register after the adapter
   * modal is opened (or the first approve can leave status stuck on
   * "Not connected"). Wait for provider registration, then retry with a dapp
   * reload when Connected is not observed — same recovery shape as BitcoinTestDapp.
   */
  async connect(): Promise<void> {
    const maxAttempts = 3;
    let lastStatus: string | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (attempt > 1) {
        await this.reloadDapp();
        // A slow first-attempt approve or reload auto-reconnect may have
        // already succeeded — exit early before re-opening the adapter.
        if (await this.isConnectionStatus('Connected', 2_000)) {
          return;
        }
      }

      await this.waitForSolanaWalletRegistered(attempt === 1 ? 15_000 : 8_000);
      await this.attemptConnect();

      const waitMs = attempt === maxAttempts ? CONNECT_TIMEOUT_MS : 15_000;
      if (await this.isConnectionStatus('Connected', waitMs)) {
        return;
      }

      lastStatus = await this.evaluate<string>(
        `document.querySelector(${JSON.stringify(
          sel(header.connectionStatus),
        )})?.textContent?.trim() || null`,
      ).catch(() => null);
    }

    throw new Error(
      `Timed out: expected "Connected", got "${lastStatus}" after ${maxAttempts} provider-ready connect attempt(s)`,
    );
  }

  async disconnect(): Promise<void> {
    // Disconnect button has structure <div data-testid="..."><button/></div>
    await this.click(`${sel(header.disconnect)} button`);
  }

  async tapCancel(): Promise<void> {
    await Gestures.waitAndTap(this.getExactTextElement('Cancel'), {
      checkForDisplayed: true,
      timeout: 10_000,
      elemDescription: 'SolanaTestDApp Cancel',
    });
  }

  async tapCancelTransaction(): Promise<void> {
    // isDisplayed() returns false for snap footer buttons — bypass display check.
    await Gestures.waitAndTap(
      Matchers.getElementByID(
        SolanaTestDappSelectorsWebIDs.CANCEL_TRANSACTION_BUTTON,
      ),
      {
        checkForDisplayed: false,
        timeout: 30_000,
        elemDescription: 'SolanaTestDApp cancel transaction',
      },
    );
  }

  async connectWithAllAccounts(): Promise<void> {
    await this.waitForSolanaWalletRegistered(15_000);
    await this.clickConnectButton();
    await this.selectMetaMaskWallet();
    // DappConnectionModal.editAccountsButton handles platform differences:
    // Android uses content-desc="Edit accounts" XPath; iOS uses resource ID.
    await Gestures.waitAndTap(DappConnectionModal.editAccountsButton, {
      timeout: 10_000,
      elemDescription: 'SolanaTestDApp edit accounts',
    });
    // Both "Select all" and "multiconnect-connect-button" are found by UiSelector but
    // isDisplayed() returns false for them — bypass with checkForDisplayed: false.
    await Gestures.waitAndTap(this.getExactTextElement('Select all'), {
      checkForDisplayed: false,
      timeout: 10_000,
      elemDescription: 'SolanaTestDApp Select all',
    });
    await Gestures.waitAndTap(
      Matchers.getElementByID('multiconnect-connect-button'),
      {
        checkForDisplayed: false,
        timeout: 10_000,
        elemDescription: 'SolanaTestDApp multiconnect connect',
      },
    );
    await DappConnectionModal.tapConnectButton({ timeout: 15_000 });
    await this.verifyConnectionStatus('Connected', CONNECT_TIMEOUT_MS);
  }

  async signMessage(): Promise<void> {
    await this.click(`button${sel(signMessage.signMessage)}`);
  }

  async confirmSignMessage(): Promise<void> {
    await Gestures.waitAndTap(this.getExactTextElement('Confirm'), {
      checkForDisplayed: false,
      timeout: 30_000,
      elemDescription: 'SolanaTestDApp Confirm',
    });
  }

  async getSignedMessage(timeoutMs = 30_000): Promise<string> {
    const deadline = Date.now() + timeoutMs;
    let text: string | null = null;
    const cssSel = `pre${sel(signMessage.signedMessage)}`;
    while (Date.now() < deadline) {
      text = await this.evaluate<string>(
        `document.querySelector(${JSON.stringify(cssSel)})?.textContent?.trim() || null`,
      ).catch(() => null);
      if (text) return text;
      await wait(POLL_MS);
    }
    throw new Error(`Timed out waiting for signed message`);
  }

  async signTransaction(): Promise<void> {
    await this.click(`button${sel(sendSol.signTransaction)}`);
  }

  async verifyConnectionStatus(
    expected: string,
    timeoutMs = 10_000,
  ): Promise<void> {
    await this.pollForText(sel(header.connectionStatus), expected, timeoutMs);
  }

  async verifyAccount(expected: string, timeoutMs = 10_000): Promise<void> {
    // Account element contains an <a> tag with the address text
    await this.pollForText(`${sel(header.account)} a`, expected, timeoutMs);
  }

  async reload(): Promise<void> {
    await this.reloadDapp();
    await this.pollForText(sel(header.connectionStatus), 'Connected');
  }
}

export default new SolanaTestDApp();
