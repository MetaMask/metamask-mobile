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
import { asPlaywrightElement } from '../../framework/EncapsulatedElement';
import { SolanaTestDappSelectorsWebIDs } from '../../selectors/Browser/SolanaTestDapp.selectors.js';

export const SOLANA_DAPP_PORT = 8095;
const BASE_URL = `http://localhost:${SOLANA_DAPP_PORT}`;

const DAPP_LOAD_TIMEOUT_MS = 30_000;
const CONNECT_TIMEOUT_MS = 30_000;
const CLICK_TIMEOUT_MS = 15_000;
const POLL_MS = 300;

// data-testid values from @metamask/test-dapp-solana
const TESTIDS = {
  CONNECT: 'testpage.header.connect',
  DISCONNECT: 'testpage.header.disconnect',
  CONNECTION_STATUS: 'testpage.header.connectionstatus',
  ACCOUNT: 'testpage.header.account',
  SIGN_MESSAGE_BUTTON: 'testpage.signmessage.signmessage',
  SIGNED_MESSAGE: 'testpage.signmessage.signedmessage',
  SIGN_TRANSACTION_BUTTON: 'testpage.sendsol.signtransaction',
} as const;

function sel(testId: string): string {
  return `[data-testid="${testId}"]`;
}

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

class SolanaTestDApp {
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
      await wait(500);
    }
    throw new Error(`Timed out: expected "${expected}", got "${actual}"`);
  }

  // Connect button has structure <div data-testid="..."><div><button/></div></div>
  async clickConnectButton(): Promise<void> {
    await this.click(`${sel(TESTIDS.CONNECT)} button`);
  }

  // MetaMask wallet option is inside the Solana wallet adapter modal (CSS class)
  async selectMetaMaskWallet(): Promise<void> {
    await this.waitForElement(SolanaTestDappSelectorsWebIDs.WALLET_BUTTON);
    await this.click(SolanaTestDappSelectorsWebIDs.WALLET_BUTTON);
  }

  async connect(): Promise<void> {
    await this.clickConnectButton();
    await this.selectMetaMaskWallet();
    await DappConnectionModal.tapConnectButton({ timeout: 15_000 });
    await this.verifyConnectionStatus('Connected', CONNECT_TIMEOUT_MS);
  }

  async disconnect(): Promise<void> {
    // Disconnect button has structure <div data-testid="..."><button/></div>
    await this.click(`${sel(TESTIDS.DISCONNECT)} button`);
  }

  async tapCancel(): Promise<void> {
    const el = await PlaywrightMatchers.getElementByText('Cancel', true);
    await PlaywrightGestures.waitAndTap(el, {
      checkForDisplayed: true,
      timeout: 10_000,
    });
  }

  async tapCancelTransaction(): Promise<void> {
    const el = await PlaywrightMatchers.getElementById(
      SolanaTestDappSelectorsWebIDs.CANCEL_TRANSACTION_BUTTON,
      { exact: true },
    );
    await el.unwrap().waitForExist({ timeout: 30_000 });
    await el.click();
  }

  async connectWithAllAccounts(): Promise<void> {
    await this.clickConnectButton();
    await this.selectMetaMaskWallet();
    // DappConnectionModal.editAccountsButton handles platform differences:
    // Android uses content-desc="Edit accounts" XPath; iOS uses resource ID.
    const editAccountsEl = await asPlaywrightElement(
      DappConnectionModal.editAccountsButton,
    );
    await PlaywrightGestures.waitAndTap(editAccountsEl, { timeout: 10_000 });
    // Both "Select all" and "multiconnect-connect-button" are found by UiSelector but
    // isDisplayed() returns false for them — bypass with waitForExist + click().
    const selectAllEl = await PlaywrightMatchers.getElementByText(
      'Select all',
      true,
    );
    await selectAllEl.unwrap().waitForExist({ timeout: 10_000 });
    await selectAllEl.click();
    const multiConnectEl = await PlaywrightMatchers.getElementById(
      'multiconnect-connect-button',
    );
    await multiConnectEl.unwrap().waitForExist({ timeout: 10_000 });
    await multiConnectEl.click();
    await DappConnectionModal.tapConnectButton({ timeout: 15_000 });
    await this.verifyConnectionStatus('Connected', CONNECT_TIMEOUT_MS);
  }

  async signMessage(): Promise<void> {
    await this.click(`button${sel(TESTIDS.SIGN_MESSAGE_BUTTON)}`);
  }

  async confirmSignMessage(): Promise<void> {
    const el = await PlaywrightMatchers.getElementByText('Confirm', true);
    await el.unwrap().waitForExist({ timeout: 30_000 });
    await el.click();
  }

  async getSignedMessage(timeoutMs = 30_000): Promise<string> {
    const deadline = Date.now() + timeoutMs;
    let text: string | null = null;
    const cssSel = `pre${sel(TESTIDS.SIGNED_MESSAGE)}`;
    while (Date.now() < deadline) {
      text = await this.evaluate<string>(
        `document.querySelector(${JSON.stringify(cssSel)})?.textContent?.trim() || null`,
      ).catch(() => null);
      if (text) return text;
      await wait(500);
    }
    throw new Error(`Timed out waiting for signed message`);
  }

  async signTransaction(): Promise<void> {
    await this.click(`button${sel(TESTIDS.SIGN_TRANSACTION_BUTTON)}`);
  }

  async verifyConnectionStatus(
    expected: string,
    timeoutMs = 10_000,
  ): Promise<void> {
    await this.pollForText(sel(TESTIDS.CONNECTION_STATUS), expected, timeoutMs);
  }

  async verifyAccount(expected: string, timeoutMs = 10_000): Promise<void> {
    // Account element contains an <a> tag with the address text
    await this.pollForText(`${sel(TESTIDS.ACCOUNT)} a`, expected, timeoutMs);
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

export default new SolanaTestDApp();
