/**
 * Component View tests for BrowserTab E2E scenarios that cannot run in CV yet.
 *
 * Mirrors:
 * - tests/smoke/wallet/browser/browser-download.spec.ts
 * - tests/smoke/wallet/connections/evm-provider-events.spec.ts
 * - tests/smoke/trending/trending-browser.spec.ts (browser + dapp portion)
 *
 * These flows require a live WebView, native file download, BackgroundBridge
 * provider events, or multi-screen navigation from Explore to Browser.
 *
 * Run: yarn jest -c jest.config.view.js BrowserTab.view.test.tsx --runInBand
 */
import '../../../../tests/component-view/mocks';
import { describeForPlatforms } from '../../../../tests/component-view/platform';

describeForPlatforms(
  'BrowserTab E2E migration placeholders (CV blockers)',
  () => {
    // --- browser-download.spec.ts ---

    it.skip('downloads a blob file — skipped: requires WebView onFileDownload and native downloadFile util', () => {
      // Blocked: WebView file download + tapjacking overlay + device filesystem.
    });

    it.skip('downloads a base64 file — skipped: requires WebView onFileDownload and native downloadFile util', () => {
      // Blocked: same as blob download — native WebView download pipeline.
    });

    // --- evm-provider-events.spec.ts ---

    it.skip('notifies the connected account and chain on load of a permitted dapp — skipped: requires TestDApp WebView and BackgroundBridge provider', () => {
      // Blocked: live dapp JavaScript bridge (eth_accounts / eth_chainId).
    });

    it.skip('notifies a dapp when the wallet switches to an account it has permission to access — skipped: requires WebView dapp + multi-screen account switch', () => {
      // Blocked: account switch propagation through native browser stack.
    });

    it.skip('notifies a permitted dapp of the new chain ID when the network changes — skipped: requires WebView dapp and ConnectedAccountsModal network permissions UI', () => {
      // Blocked: chainChanged event delivery to embedded dapp.
    });

    // --- trending-browser.spec.ts ---

    it.skip('navigate to browser from trending view and interact with dapp — skipped: requires Explore → Browser navigation and TestDApp WebView', () => {
      // Blocked: full browser stack with embedded dapp page load.
    });
  },
);
