import { dataTestIds } from '@metamask/test-dapp-stellar';
import ChromeCdpHelpers from '../../framework/ChromeCdpHelpers.js';
import { localDappBrowserUrl } from '../../framework/e2eWorkerPorts.ts';
import Gestures from '../../framework/Gestures.js';
import Matchers from '../../framework/Matchers.js';
import { navigateToBrowserView } from '../../flows/browser.flow.js';
import { dismissPushNotificationExistingUserSheet } from '../../flows/wallet.flow.js';
import DappConnectionModal from '../MMConnect/DappConnectionModal.js';
import BrowserView from './BrowserView.js';

export const STELLAR_DAPP_PORT = 8096;

const DAPP_LOAD_TIMEOUT_MS = 30_000;
const CONNECT_TIMEOUT_MS = 30_000;
const CLICK_TIMEOUT_MS = 15_000;
const POLL_MS = 300;

const { header, signAuthEntry, signMessage, signTransaction } =
  dataTestIds.testPage;

function getStellarTestDappBaseUrl(
  env: Record<string, string | undefined> = process.env,
): string {
  return localDappBrowserUrl(STELLAR_DAPP_PORT, env);
}

function sel(testId: string): string {
  return `[data-testid="${testId}"]`;
}

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

class StellarTestDapp {
  async navigateToDapp(): Promise<void> {
    ChromeCdpHelpers.resetMetaMaskWebViewCache();
    await navigateToBrowserView();
    await dismissPushNotificationExistingUserSheet();
    await BrowserView.tapUrlInputBox();
    await BrowserView.navigateToURL(getStellarTestDappBaseUrl());
    await this.waitForDappLoaded();
  }

  private async evaluate<T>(expression: string): Promise<T | null> {
    return ChromeCdpHelpers.evaluateInWebView<T>(
      getStellarTestDappBaseUrl(),
      expression,
    );
  }

  private async getConnectionStatus(): Promise<string | null> {
    return this.evaluate<string>(
      `document.querySelector(${JSON.stringify(
        sel(header.connectionStatus),
      )})?.textContent?.trim() || null`,
    ).catch(() => null);
  }

  private async waitForDappLoaded(
    timeoutMs = DAPP_LOAD_TIMEOUT_MS,
  ): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (await this.getConnectionStatus()) {
        return;
      }
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
      if (exists) {
        return;
      }
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
        const element = document.querySelector(${JSON.stringify(cssSelector)});
        if (!(element instanceof HTMLElement)) return false;
        element.click();
        return true;
      })()`,
    );
    if (!clicked) {
      throw new Error(`Element not found in WebView: ${cssSelector}`);
    }
  }

  private async clickButtonByText(
    text: string,
    timeoutMs = CLICK_TIMEOUT_MS,
  ): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const clicked = await this.evaluate<boolean>(
        `(() => {
          const element = Array.from(document.querySelectorAll('button')).find(
            (button) => button.textContent?.includes(${JSON.stringify(text)}),
          );
          if (!(element instanceof HTMLElement)) return false;
          element.click();
          return true;
        })()`,
      );
      if (clicked) {
        return;
      }
      await wait(POLL_MS);
    }
    throw new Error(`Timed out waiting for button containing "${text}"`);
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
        `document.querySelector(${JSON.stringify(
          cssSelector,
        )})?.textContent?.trim() || null`,
      ).catch(() => null);
      if (actual === expected) {
        return;
      }
      await wait(POLL_MS);
    }
    throw new Error(`Timed out: expected "${expected}", got "${actual}"`);
  }

  private async pollForPattern(
    cssSelector: string,
    pattern: RegExp,
    timeoutMs = 30_000,
  ): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    let actual: string | null = null;
    while (Date.now() < deadline) {
      actual = await this.evaluate<string>(
        `document.querySelector(${JSON.stringify(
          cssSelector,
        )})?.textContent?.trim() || null`,
      ).catch(() => null);
      if (actual && pattern.test(actual)) {
        return;
      }
      await wait(POLL_MS);
    }
    throw new Error(
      `Timed out waiting for ${cssSelector} to match ${pattern}; got "${actual}"`,
    );
  }

  async connect(): Promise<void> {
    await this.click(`button${sel(header.connect)}`);
    await this.clickButtonByText('MetaMask');
    await DappConnectionModal.tapConnectButton({ timeout: 15_000 });
    await this.verifyConnectionStatus('Connected', CONNECT_TIMEOUT_MS);
  }

  async disconnect(): Promise<void> {
    await this.click(`button${sel(header.disconnect)}`);
  }

  async reload(): Promise<void> {
    await this.evaluate('(() => { location.reload(); return true; })()');
    ChromeCdpHelpers.resetMetaMaskWebViewCache();
    await this.waitForDappLoaded();
    await this.verifyConnectionStatus('Connected', CONNECT_TIMEOUT_MS);
  }

  async selectNetwork(networkKey: string): Promise<void> {
    const selector = `select${sel(header.network)}`;
    const selected = await this.evaluate<boolean>(
      `(() => {
        const element = document.querySelector(${JSON.stringify(selector)});
        if (!(element instanceof HTMLSelectElement)) return false;
        const valueDescriptor = Object.getOwnPropertyDescriptor(
          window.HTMLSelectElement.prototype,
          'value',
        );
        valueDescriptor?.set?.call(element, ${JSON.stringify(networkKey)});
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        return element.value === ${JSON.stringify(networkKey)};
      })()`,
    );
    if (!selected) {
      throw new Error(`Could not select Stellar network "${networkKey}"`);
    }
  }

  async verifyAccount(expected: string, timeoutMs = 10_000): Promise<void> {
    await this.pollForText(`${sel(header.account)} a`, expected, timeoutMs);
  }

  async verifyConnectionStatus(
    expected: string,
    timeoutMs = 10_000,
  ): Promise<void> {
    await this.pollForText(sel(header.connectionStatus), expected, timeoutMs);
  }

  async fillAuthEntry(authEntryXdr: string): Promise<void> {
    const selector = `textarea${sel(signAuthEntry.authEntry)}`;
    const filled = await this.evaluate<boolean>(
      `(() => {
        const element = document.querySelector(${JSON.stringify(selector)});
        if (!(element instanceof HTMLTextAreaElement)) return false;
        const valueDescriptor = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype,
          'value',
        );
        valueDescriptor?.set?.call(element, ${JSON.stringify(authEntryXdr)});
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        return element.value === ${JSON.stringify(authEntryXdr)};
      })()`,
    );
    if (!filled) {
      throw new Error('Could not fill Stellar auth entry');
    }
  }

  async signAuthEntry(): Promise<void> {
    await this.click(`button${sel(signAuthEntry.signAuthEntry)}`);
  }

  async signMessage(): Promise<void> {
    await this.click(`button${sel(signMessage.signMessage)}`);
  }

  async loadExampleXdr(): Promise<void> {
    await this.click(`button${sel(signTransaction.loadExampleXdr)}`);
  }

  async signTransaction(): Promise<void> {
    await this.click(`button${sel(signTransaction.signTransaction)}`);
  }

  async confirm(): Promise<void> {
    await Gestures.waitAndTap(Matchers.getElementByText('Approve'), {
      checkForDisplayed: false,
      timeout: 30_000,
      elemDescription: 'Approve Stellar request',
    });
  }

  async verifySignedAuthEntry(pattern: RegExp): Promise<void> {
    await this.pollForPattern(
      `pre${sel(signAuthEntry.signedAuthEntry)}`,
      pattern,
    );
  }

  async verifySignedMessage(pattern: RegExp): Promise<void> {
    await this.pollForPattern(`pre${sel(signMessage.signedMessage)}`, pattern);
  }

  async verifySignedTransaction(pattern: RegExp): Promise<void> {
    await this.pollForPattern(
      `pre${sel(signTransaction.signedTransaction)}`,
      pattern,
    );
  }
}

export default new StellarTestDapp();
