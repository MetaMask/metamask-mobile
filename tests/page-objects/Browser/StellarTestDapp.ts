import ChromeCdpHelpers from '../../framework/ChromeCdpHelpers.js';
import {
  loginToAppPlaywright,
  dismissPushNotificationExistingUserSheet,
  waitForWalletHomePlaywright,
} from '../../flows/wallet.flow.js';
import { navigateToBrowserView } from '../../flows/browser.flow.js';
import BrowserView from './BrowserView.js';
import WalletView from '../wallet/WalletView.js';
import AccountListBottomSheet from '../wallet/AccountListBottomSheet.js';
import DappConnectionModal from '../MMConnect/DappConnectionModal.js';
import Assertions from '../../framework/Assertions.js';
import Gestures from '../../framework/Gestures.js';
import Matchers from '../../framework/Matchers.js';
import { dataTestIds } from '@metamask/test-dapp-stellar';
import { StellarTestDappSelectorsWebIDs } from '../../selectors/Browser/StellarTestDapp.selectors.js';
import { ConnectAccountBottomSheetSelectorsIDs } from '../../../app/components/Views/MultichainAccounts/shared/ConnectAccountBottomSheet.testIds';

export const STELLAR_DAPP_PORT = 8096;
const BASE_URL = `http://localhost:${STELLAR_DAPP_PORT}`;

const DAPP_LOAD_TIMEOUT_MS = 30_000;
const CONNECT_TIMEOUT_MS = 30_000;
const CONNECT_RETRY_TIMEOUT_MS = 180_000;
const CONNECT_RETRY_INTERVAL_MS = 8_000;
const CLICK_TIMEOUT_MS = 15_000;
const POLL_MS = 300;

const { header, signMessage } = dataTestIds.testPage;

function sel(testId: string): string {
  return `[data-testid="${testId}"]`;
}

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

class StellarTestDapp {
  async setupAndNavigate(): Promise<void> {
    ChromeCdpHelpers.resetMetaMaskWebViewCache();
    await loginToAppPlaywright({ scenarioType: 'e2e' });
    // wallet_createSession for stellar:pubnet returns 5100 until a snap account
    // exists. Create it via multichain Add account.
    await this.createStellarAccount();
    await navigateToBrowserView();
    await dismissPushNotificationExistingUserSheet();
    await BrowserView.tapUrlInputBox();
    await BrowserView.navigateToURL(BASE_URL);
    await this.waitForDappLoaded();
    // Stellar adapter only supports stellar:pubnet. The dapp
    // defaults to testnet, which fails createSession with "Requested scopes
    // are not supported".
    await this.selectPubnet();
  }

  private async createStellarAccount(): Promise<void> {
    await WalletView.tapIdenticon();
    await AccountListBottomSheet.tapAddAccountButtonV2();
    await Assertions.expectTextDisplayed('Account 2', {
      timeout: 30_000,
      description: 'multichain Add account created Account 2',
    });
    await AccountListBottomSheet.tapAccountByNameV2('Account 1', true);
    await waitForWalletHomePlaywright();
  }

  private async evaluate<T>(expression: string): Promise<T | null> {
    return ChromeCdpHelpers.evaluateInWebView<T>(BASE_URL, expression);
  }

  private async getConnectionStatus(): Promise<string | null> {
    return this.evaluate<string>(
      `document.querySelector(${JSON.stringify(sel(header.connectionStatus))})?.textContent?.trim() || null`,
    ).catch(() => null);
  }

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
      `Timed out waiting for Stellar test dapp to load within ${timeoutMs}ms`,
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

  private async clickByXPath(
    xpath: string,
    timeoutMs = CLICK_TIMEOUT_MS,
  ): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const clicked = await this.evaluate<boolean>(
        `(() => {
          const node = document.evaluate(
            ${JSON.stringify(xpath)},
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null,
          ).singleNodeValue;
          if (!(node instanceof HTMLElement)) return false;
          node.click();
          return true;
        })()`,
      );
      if (clicked) return;
      await wait(POLL_MS);
    }
    throw new Error(`Timed out waiting to click xpath "${xpath}"`);
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

  private async pollForTextMatch(
    cssSelector: string,
    pattern: RegExp,
    timeoutMs = 15_000,
  ): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    let actual: string | null = null;
    while (Date.now() < deadline) {
      actual = await this.evaluate<string>(
        `document.querySelector(${JSON.stringify(cssSelector)})?.textContent?.trim() || null`,
      ).catch(() => null);
      if (actual && pattern.test(actual)) return;
      await wait(POLL_MS);
    }
    throw new Error(
      `Timed out waiting for "${cssSelector}" to match ${pattern}: got "${actual}"`,
    );
  }

  /**
   * The dapp defaults to testnet (`_v = "testnet"`). MetaMask connect-stellar
   * only creates sessions for stellar:pubnet, so switch the header <select>
   * before wallet_createSession.
   */
  private async selectPubnet(timeoutMs = 10_000): Promise<void> {
    const networkSelector = sel(header.network);
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const selected = await this.evaluate<string>(
        `(() => {
          const el = document.querySelector(${JSON.stringify(networkSelector)});
          if (!(el instanceof HTMLSelectElement)) return null;
          if (el.value !== 'pubnet') {
            const setter = Object.getOwnPropertyDescriptor(
              HTMLSelectElement.prototype,
              'value',
            )?.set;
            setter?.call(el, 'pubnet');
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }
          return el.value;
        })()`,
      );
      if (selected === 'pubnet') return;
      await wait(POLL_MS);
    }
    throw new Error(
      `Timed out switching Stellar dapp network to pubnet within ${timeoutMs}ms`,
    );
  }

  /**
   * wallet_createSession for stellar:pubnet returns 5100 until login-time
   * XlmAccountProvider alignment creates the snap account. Retry only until the
   * native sheet mounts (or the dapp already shows Connected after reload).
   * Approve and status verification happen once.
   */
  async connect(): Promise<void> {
    const ready = await this.waitForConnectSheet();
    if (ready === 'sheet') {
      await DappConnectionModal.tapConnectButton({ timeout: 12_000 });
    }
    await this.verifyConnectionStatus('Connected', CONNECT_TIMEOUT_MS);
  }

  private async waitForConnectSheet(): Promise<'connected' | 'sheet'> {
    const deadline = Date.now() + CONNECT_RETRY_TIMEOUT_MS;
    let attempt = 0;
    let lastError: Error | undefined;
    const connectButton = Matchers.getElementByID(
      ConnectAccountBottomSheetSelectorsIDs.CONNECT_BUTTON,
    );

    while (Date.now() < deadline) {
      if ((await this.getConnectionStatus()) === 'Connected') {
        return 'connected';
      }

      try {
        if (attempt > 0) {
          await this.reloadPage();
          await this.selectPubnet();
          if ((await this.getConnectionStatus()) === 'Connected') {
            return 'connected';
          }
        } else {
          await this.selectPubnet();
        }

        await this.click(`button${sel(header.connect)}`);
        await this.clickByXPath(
          StellarTestDappSelectorsWebIDs.METAMASK_WALLET_OPTION_XPATH,
        );
        await Assertions.expectElementToBeVisible(connectButton, {
          timeout: 12_000,
          description: 'Stellar connect sheet',
        });
        return 'sheet';
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        attempt += 1;
        await wait(CONNECT_RETRY_INTERVAL_MS);
      }
    }

    throw lastError ?? new Error('Stellar connect sheet did not appear');
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
    const confirmButton = Matchers.getElementByID(
      StellarTestDappSelectorsWebIDs.CONFIRM_SIGN_MESSAGE_BUTTON,
    );
    await Assertions.expectElementToExist(confirmButton, {
      timeout: 30_000,
      description: 'Stellar sign-message Confirm button',
    });
    // iOS Snap UI footer nodes often report visible=false.
    await Gestures.waitAndTap(confirmButton, {
      timeout: 10_000,
      checkForDisplayed: false,
      checkEnabled: false,
      elemDescription: 'Stellar sign-message Confirm button',
    });
  }

  async verifySignedMessageMatches(
    pattern: RegExp,
    timeoutMs = 15_000,
  ): Promise<void> {
    await this.pollForTextMatch(
      `pre${sel(signMessage.signedMessage)}`,
      pattern,
      timeoutMs,
    );
  }

  private async reloadPage(): Promise<void> {
    await this.evaluate('(() => { location.reload(); return true; })()');
    ChromeCdpHelpers.resetMetaMaskWebViewCache();
    await this.waitForDappLoaded();
  }

  async reload(): Promise<void> {
    await this.reloadPage();
    await this.verifyConnectionStatus('Connected', CONNECT_TIMEOUT_MS);
  }
}

export default new StellarTestDapp();
