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

  /**
   * After Connect, the modal shows either a wallet option (provider ready) or
   * "No wallet available" (mount captured wallets=[]). Exit early on empty so
   * we can reload instead of burning the full poll window.
   */
  private async waitForWalletModalOutcome(
    walletOptionSelector: string,
    timeoutMs: number,
  ): Promise<'wallet' | 'empty' | 'timeout'> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const state = await this.evaluate<{
        hasWallet: boolean;
        noWallet: boolean;
      }>(
        `(() => {
          const hasWallet = Boolean(
            document.querySelector(${JSON.stringify(walletOptionSelector)}),
          );
          const noWallet = Array.from(document.querySelectorAll('p')).some(
            (el) => el.textContent?.includes('No wallet available'),
          );
          return { hasWallet, noWallet };
        })()`,
      ).catch(() => null);

      if (state?.hasWallet) return 'wallet';
      if (state?.noWallet) return 'empty';
      await wait(POLL_MS);
    }
    return 'timeout';
  }

  /**
   * Detect whether MetaMask's Bitcoin wallet-standard provider has registered
   * in the page via the app-ready / register-wallet handshake.
   */
  private async isBitcoinWalletRegistered(): Promise<boolean> {
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
   * Poll until the Bitcoin wallet-standard provider registers, or the timeout
   * elapses. Returns whether registration was observed (does not throw — the
   * Connect recovery loop still handles empty-wallet outcomes).
   */
  private async waitForBitcoinWalletRegistered(
    timeoutMs = 10_000,
  ): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (await this.isBitcoinWalletRegistered()) {
        return true;
      }
      await wait(POLL_MS);
    }
    return false;
  }

  /**
   * Best-effort close of the empty wallet-selection modal before remounting.
   * Backdrop click / Escape match the dapp's modal dismiss handlers.
   */
  private async closeWalletSelectionModalBestEffort(): Promise<void> {
    await this.evaluate(
      `(() => {
        const modal = document.querySelector(${JSON.stringify(
          sel(walletSelectionModal.id),
        )});
        if (!modal) return false;
        const overlay = modal.parentElement;
        if (overlay instanceof HTMLElement) {
          overlay.click();
        }
        document.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
        );
        return true;
      })()`,
    );
  }

  /**
   * Opens the wallet-selection modal. On Android CI the Bitcoin provider can
   * register after test-dapp-bitcoin's one-shot mount `useEffect([])`, leaving
   * wallets=[] ("No wallet available") until reload. Reload remounts the
   * effect; re-tapping Connect alone cannot.
   *
   * Blind reload loops (3 Connect attempts) still flake when the provider is
   * slower than the remount. Wait for wallet-standard registration, then
   * remount so the mount effect captures a non-empty wallets list before
   * Connect. Retry that provider-ready remount path up to maxAttempts.
   */
  private async openWalletSelectionModal(): Promise<void> {
    const walletOptionSelector = `button${sel(
      walletSelectionModal.walletOption,
    )}`;
    const connectSelector = `button${sel(header.connect)}`;
    const maxAttempts = 5;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (attempt > 1) {
        await this.closeWalletSelectionModalBestEffort();
      }

      // Provider must be present *before* remount so the dapp's one-shot
      // useEffect sees MetaMask Bitcoin instead of wallets=[].
      await this.waitForBitcoinWalletRegistered(attempt === 1 ? 15_000 : 8_000);
      await this.reloadDapp();

      await this.click(connectSelector);
      const waitMs = attempt === maxAttempts ? CONNECT_TIMEOUT_MS : 12_000;
      const outcome = await this.waitForWalletModalOutcome(
        walletOptionSelector,
        waitMs,
      );
      if (outcome === 'wallet') {
        return;
      }
    }

    throw new Error(
      `Timed out waiting for "${walletOptionSelector}" to appear after ${maxAttempts} provider-ready reload + connect attempt(s)`,
    );
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
      const actual = await this.getConnectionStatus();
      if (actual === expected) {
        return true;
      }
      await wait(POLL_MS);
    }
    return false;
  }

  /**
   * Single approve attempt after the wallet-selection modal is ready: pick the
   * MetaMask Bitcoin option, confirm the standard path, and tap the native
   * connect sheet.
   */
  private async attemptApproveConnection(): Promise<void> {
    await this.click(`button${sel(walletSelectionModal.walletOption)}`);
    await this.click(`button${sel(walletSelectionModal.standardButton)}`);
    await DappConnectionModal.tapConnectButton({ timeout: 15_000 });
  }

  /**
   * Connect to MetaMask via the Bitcoin wallet-standard test dapp.
   *
   * Provider-ready remount (openWalletSelectionModal) covers wallets=[] on
   * mount. Separately, iOS CI still flakes when the native `connect-button`
   * sheet never appears after wallet selection, or approve leaves status on
   * "Not connected". Retry the full open + approve path (reload is inside
   * openWalletSelectionModal) — same recovery shape as SolanaTestDApp.
   */
  async connect(): Promise<void> {
    const maxAttempts = 3;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      // A slow first-attempt approve or reload auto-reconnect may have
      // already succeeded — exit early before re-opening the modal.
      if (attempt > 1 && (await this.isConnectionStatus('Connected', 2_000))) {
        return;
      }

      try {
        await this.openWalletSelectionModal();
        await this.attemptApproveConnection();
        const waitMs =
          attempt === maxAttempts ? CONNECT_TIMEOUT_MS : 15_000;
        if (await this.isConnectionStatus('Connected', waitMs)) {
          return;
        }
        lastError = new Error(
          `Timed out: expected "Connected" after native approve (attempt ${attempt}/${maxAttempts})`,
        );
      } catch (error) {
        lastError = error;
      }
    }

    if (lastError instanceof Error) {
      throw lastError;
    }
    throw new Error(
      `Bitcoin connect failed after ${maxAttempts} provider-ready open + approve attempt(s)`,
    );
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
    await Gestures.waitAndTap(Matchers.getElementByText('Approve'), {
      checkForDisplayed: true,
      timeout: 15_000,
      elemDescription: 'Approve sign message',
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
