/* eslint-disable no-restricted-syntax */
import { waitFor } from 'detox';
import { isCaipChainId } from '@metamask/utils';

import TestHelpers from '../../helpers';
import { getDappUrl } from '../../framework/fixtures/FixtureUtils';
import { loginToApp } from '../../flows/wallet.flow';
import { navigateToBrowserView } from '../../flows/browser.flow';
import Assertions from '../../framework/Assertions';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import Utilities from '../../framework/Utilities';
import { createLogger } from '../../framework/logger';
import { BrowserViewSelectorsIDs } from '../../../app/components/Views/BrowserTab/BrowserView.testIds';
import { MMConnectDappTestIds } from '../../selectors/MMConnect/MMConnectDapp.testIds';
import Browser from './BrowserView';

const logger = createLogger({
  name: 'MMConnectBrowserPlaygroundDapp',
});

/**
 * Mirror of `@metamask/playground-ui` `escapeTestId`: lowercase, `:` → `-`,
 * `_` → `-`, spaces → `-`, strip any remaining non `[a-z0-9-]` characters.
 */
function escapeTestId(value: string): string {
  return value
    .toLowerCase()
    .replace(/:/g, '-')
    .replace(/\s+/g, '-')
    .replace(/_/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

/**
 * Mirror of `@metamask/playground-ui` `createTestId`: join escaped parts
 * with `-`, dropping empty pieces.
 */
function createTestId(...parts: string[]): string {
  return parts.map(escapeTestId).filter(Boolean).join('-');
}

/**
 * Page object for the `@metamask/browser-playground` MMConnect dapp loaded
 * inside MetaMask Mobile's in-app browser (BrowserTab WebView). Detox sibling
 * of `BrowserPlaygroundDapp.ts` (Playwright/Appium perf tests); both consume
 * the same selector constants. Static test IDs live in `MMConnectDappTestIds`;
 * dynamic IDs (scope cards, methods) are constructed via the local
 * `createTestId` helper above so the escaping stays in lockstep with the
 * dapp's `@metamask/playground-ui` runtime IDs.
 */
class MMConnectBrowserPlaygroundDapp {
  /**
   * Get an in-WebView element by its `data-testid` attribute (the dapp sets
   * `data-testid`, not `id`). Returns the framework's global `WebElement`
   * (a Promise<IndexableWebElement>) so it composes directly with
   * `Gestures.scrollToWebViewPort` / `Gestures.waitAndTap`.
   */
  private getByDataTestId(testId: string): WebElement {
    return Matchers.getElementByCSS(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      `[data-testid="${testId}"]`,
    ) as WebElement;
  }

  // App-level elements

  get appContainer(): WebElement {
    return this.getByDataTestId(MMConnectDappTestIds.RM_APP_CONTAINER);
  }

  get connectMultichainButton(): WebElement {
    // `app-btn-connect` with no variant suffix is the multichain entrypoint.
    return this.getByDataTestId(MMConnectDappTestIds.CONNECT_BUTTON);
  }

  get connectLegacyButton(): WebElement {
    return this.getByDataTestId(MMConnectDappTestIds.CONNECT_BUTTON_LEGACY);
  }

  get disconnectAllButton(): WebElement {
    return this.getByDataTestId(MMConnectDappTestIds.DISCONNECT_BUTTON);
  }

  get scopesSection(): WebElement {
    // Only rendered when the multichain session has at least one scope.
    return this.getByDataTestId('app-section-scopes');
  }

  // Legacy EVM card elements

  get legacyEvmCard(): WebElement {
    return this.getByDataTestId(MMConnectDappTestIds.LEGACY_EVM_CARD);
  }

  get legacyEvmChainIdValue(): WebElement {
    return this.getByDataTestId(MMConnectDappTestIds.LEGACY_EVM_CHAIN_ID_VALUE);
  }

  get legacyEvmPersonalSignButton(): WebElement {
    return this.getByDataTestId(
      MMConnectDappTestIds.LEGACY_EVM_BTN_PERSONAL_SIGN,
    );
  }

  get legacyEvmSendTransactionButton(): WebElement {
    return this.getByDataTestId(
      MMConnectDappTestIds.LEGACY_EVM_BTN_SEND_TRANSACTION,
    );
  }

  get legacyEvmSwitchToMainnetButton(): WebElement {
    return this.getByDataTestId(
      MMConnectDappTestIds.LEGACY_EVM_BTN_SWITCH_MAINNET,
    );
  }

  get legacyEvmResponseText(): WebElement {
    return this.getByDataTestId(MMConnectDappTestIds.LEGACY_EVM_RESPONSE_TEXT);
  }

  // Dynamic selectors — scope cards & DynamicInputs checkboxes

  /**
   * Normalize a chain ID into a CAIP-2 scope ('eip155:1', 'solana:...').
   * Decimal numbers and `0x...` hex are treated as EVM chain references.
   */
  private toScope(chainIdOrScope: string): string {
    if (isCaipChainId(chainIdOrScope)) {
      return chainIdOrScope;
    }
    if (chainIdOrScope.startsWith('0x')) {
      return `eip155:${parseInt(chainIdOrScope, 16)}`;
    }
    return `eip155:${chainIdOrScope}`;
  }

  scopeCard(chainIdOrScope: string): WebElement {
    const scope = this.toScope(chainIdOrScope);
    return this.getByDataTestId(
      createTestId(MMConnectDappTestIds.SCOPE_CARD, scope),
    );
  }

  scopeCardMethodSelect(chainIdOrScope: string): WebElement {
    const scope = this.toScope(chainIdOrScope);
    return this.getByDataTestId(
      createTestId(MMConnectDappTestIds.SCOPE_CARD_METHOD_SELECT, scope),
    );
  }

  scopeCardInvokeButton(chainIdOrScope: string): WebElement {
    const scope = this.toScope(chainIdOrScope);
    return this.getByDataTestId(
      createTestId(MMConnectDappTestIds.SCOPE_CARD_INVOKE_BTN, scope),
    );
  }

  scopeCardResultCode(
    chainIdOrScope: string,
    method: string,
    index: number = 0,
  ): WebElement {
    const scope = this.toScope(chainIdOrScope);
    return this.getByDataTestId(
      createTestId(
        MMConnectDappTestIds.SCOPE_CARD_RESULT_CODE,
        scope,
        method,
        String(index),
      ),
    );
  }

  // Navigation

  /**
   * Navigate the in-app browser to the locally-served MMConnect dapp.
   * Relies on `withFixtures({ dapps: [{ dappVariant: BROWSER_PLAYGROUND }] })`
   * to start the dapp server and on the standard fixture infra to expose
   * `getDappUrl(0)` (with adb reverse on Android).
   */
  async navigateToMMConnectDapp(): Promise<void> {
    await Browser.tapUrlInputBox();
    await Browser.navigateToURL(getDappUrl(0));

    await waitFor(element(by.id(BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID)))
      .toBeVisible()
      .withTimeout(10000);
  }

  /**
   * Standard setup for an in-app browser MMConnect test: log in, navigate to
   * the browser view, open the dapp, and confirm the dapp's root container
   * is mounted.
   *
   * IMPORTANT: callers should NOT wrap this in `device.disableSynchronization()`.
   * Login + browser-view navigation rely on Detox idle sync to settle the tab
   * bar layout (the Explore tab sits inside the bottom safe area on
   * iPhone 16 Pro / iOS 26; tapping it before layout settles trips the
   * "View does not pass visibility percent threshold" check). Callers should
   * disable synchronization *after* this method returns, around the WebView +
   * native bottom-sheet dance that actually needs it.
   */
  async setupAndNavigateToTestDapp({
    skipLogin = false,
  }: { skipLogin?: boolean } = {}): Promise<void> {
    if (!skipLogin) {
      await TestHelpers.reverseServerPort();
      await loginToApp();
    }
    await navigateToBrowserView();
    await this.navigateToMMConnectDapp();

    await Assertions.expectElementToBeVisible(
      Promise.resolve(
        element(by.id(BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID)),
      ),
      { description: 'BrowserTab WebView should be visible' },
    );

    // Wait for the dapp's React root to mount before any further interaction.
    // Without this, `tapButton(connectLegacyButton)` can race the initial paint
    // and resolve against a stale element.
    await this.waitForAppContainer();
  }

  // Interactions

  /**
   * Tap any in-WebView element, scrolling it into view first. Mirrors
   * `SolanaTestDApp.tapButton` — `Gestures.scrollToWebViewPort` and
   * `Gestures.waitAndTap` both await the WebElement promise internally, so
   * we pass it through without resolving here.
   */
  private async tapElement(elem: WebElement): Promise<void> {
    await Gestures.scrollToWebViewPort(elem);
    await Gestures.waitAndTap(elem);
  }

  async waitForAppContainer(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.appContainer, {
      description: 'MMConnect dapp app-container should be visible',
    });
  }

  /**
   * Reload the in-app browser tab and wait for the dapp's React root to
   * remount. MMConnect persists its session through `@metamask/connect-*`
   * storage adapters, so the dapp should rehydrate the same session on the
   * next mount; the spec is responsible for asserting that (e.g. legacy
   * card or scopes section reappear).
   */
  async reloadDapp(): Promise<void> {
    await Browser.reloadTab();
    await this.waitForAppContainer();
  }

  async tapConnectLegacy(): Promise<void> {
    await this.tapElement(this.connectLegacyButton);
  }

  async tapConnectMultichain(): Promise<void> {
    await this.tapElement(this.connectMultichainButton);
  }

  async tapDisconnectAll(): Promise<void> {
    await this.tapElement(this.disconnectAllButton);
  }

  async tapLegacyPersonalSign(): Promise<void> {
    await this.tapElement(this.legacyEvmPersonalSignButton);
  }

  async tapLegacySendTransaction(): Promise<void> {
    await this.tapElement(this.legacyEvmSendTransactionButton);
  }

  /**
   * Tap the Legacy EVM "Switch to Mainnet" button, which issues a
   * dapp-initiated `wallet_switchEthereumChain` to `0x1`.
   */
  async tapLegacySwitchToMainnet(): Promise<void> {
    await this.tapElement(this.legacyEvmSwitchToMainnetButton);
  }

  /**
   * Select a method in the per-scope ScopeCard `<select>`. The dapp listens
   * for the native `change` event, so we set `value` and dispatch `change`
   * manually rather than tapping the option (Detox cannot reliably tap
   * native-select options inside a WebView).
   */
  async selectScopeCardMethod(
    chainIdOrScope: string,
    method: string,
  ): Promise<void> {
    const select = (await this.scopeCardMethodSelect(
      chainIdOrScope,
    )) as unknown as Detox.IndexableWebElement;
    await select.scrollToView();
    // The dapp value is the method name verbatim (e.g. 'personal_sign').
    // Escape single quotes defensively in case of future method names.
    const escaped = method.replace(/'/g, "\\'");
    await select.runScript(`(el) => {
      el.value = '${escaped}';
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }`);
    // Give React a tick to commit the selected-method state.
    await TestHelpers.delay(500);
  }

  /** Tap the per-scope "Invoke Method" button after selecting a method. */
  async invokeScopeCardMethod(chainIdOrScope: string): Promise<void> {
    await this.tapElement(this.scopeCardInvokeButton(chainIdOrScope));
  }

  // Assertions

  async assertLegacyEvmCardVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.legacyEvmCard, {
      description: 'Legacy EVM card should be visible',
    });
  }

  async assertLegacyEvmCardNotVisible(): Promise<void> {
    await Assertions.expectElementToNotBeVisible(this.legacyEvmCard, {
      description: 'Legacy EVM card should NOT be visible',
    });
  }

  async assertScopesSectionVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.scopesSection, {
      description: 'Multichain scopes section should be visible',
    });
  }

  async assertScopesSectionNotVisible(): Promise<void> {
    await Assertions.expectElementToNotBeVisible(this.scopesSection, {
      description: 'Multichain scopes section should NOT be visible',
    });
  }

  async assertScopeCardVisible(chainIdOrScope: string): Promise<void> {
    const scope = this.toScope(chainIdOrScope);
    await Assertions.expectElementToBeVisible(this.scopeCard(chainIdOrScope), {
      description: `Scope card for ${scope} should be visible`,
    });
  }

  /**
   * Poll a WebView element's `textContent` until it contains `expected`.
   * Wraps Detox `runScript` in `Utilities.executeWithRetry` so the dapp's
   * async response (signature, RPC result, etc.) has time to settle.
   */
  private async expectWebElementTextToContain(
    elemPromise: WebElement,
    expected: string,
    description: string,
  ): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        const elem =
          (await elemPromise) as unknown as Detox.IndexableWebElement;
        await (elem.scrollToView() as unknown as Promise<void>).catch(() => {
          // scrollToView throws on detached/not-yet-rendered nodes; the next
          // runScript will surface a clearer error if the node never appears.
        });
        const text =
          ((await elem.runScript(
            '(el) => el.textContent || ""',
          )) as unknown as string) ?? '';
        if (!text.includes(expected)) {
          throw new Error(
            `Expected ${description} to contain "${expected}", got: "${text}"`,
          );
        }
      },
      { timeout: 30000, description: `Wait for ${description}` },
    );
    logger.debug(`${description} contains "${expected}"`);
  }

  /**
   * Wait until the Legacy EVM card's response text contains the given
   * substring (e.g. `0x` for a successful `personal_sign`).
   */
  async assertLegacyEvmResponseContains(expected: string): Promise<void> {
    await this.expectWebElementTextToContain(
      this.legacyEvmResponseText,
      expected,
      'Legacy EVM response text',
    );
  }

  /**
   * Wait until the Legacy EVM card's chain-id readout contains `expected`
   * (e.g. `0x53a` after the wallet swaps the dapp's permitted chain set).
   *
   * The dapp renders the value from the EIP-1193 `chainChanged` event, so
   * this also implicitly asserts that the SDK observed the wallet-side
   * permissions change.
   */
  async assertLegacyEvmChainIdContains(expected: string): Promise<void> {
    await this.expectWebElementTextToContain(
      this.legacyEvmChainIdValue,
      expected,
      'Legacy EVM chain id value',
    );
  }

  /**
   * Wait until the per-scope result code element contains the given
   * substring (e.g. `0x` for a `personal_sign` signature).
   */
  async assertScopeCardResultContains(
    chainIdOrScope: string,
    method: string,
    expected: string,
  ): Promise<void> {
    const scope = this.toScope(chainIdOrScope);
    await this.expectWebElementTextToContain(
      this.scopeCardResultCode(chainIdOrScope, method),
      expected,
      `Scope card result for ${scope} ${method}`,
    );
  }
}

export default new MMConnectBrowserPlaygroundDapp();
