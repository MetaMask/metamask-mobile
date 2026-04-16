import {
  encapsulated,
  EncapsulatedElementType,
  asPlaywrightElement,
} from '../../framework/EncapsulatedElement';
import { encapsulatedAction } from '../../framework/encapsulatedAction';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';
import { sleep } from '../../framework/Utilities';
import { PLAYGROUND_PACKAGE_ID } from '../../framework/Constants';
import { getDriver } from '../../framework/PlaywrightUtilities';
import { PlaywrightGestures } from '../../framework';
import { expect } from '@playwright/test';
import { MMConnectDappTestIds } from '../../selectors/MMConnect/MMConnectDapp.testIds';

function escapeTestId(value: string): string {
  return value
    .toLowerCase()
    .replace(/:/g, '-')
    .replace(/\s+/g, '-')
    .replace(/_/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

class RNPlaygroundDapp {
  private getByTestId(testId: string): EncapsulatedElementType {
    return encapsulated({
      appium: () => PlaywrightMatchers.getElementById(testId),
    });
  }

  // App-level selectors
  get appContainer(): EncapsulatedElementType {
    return this.getByTestId(MMConnectDappTestIds.RM_APP_CONTAINER);
  }

  get appTitle(): EncapsulatedElementType {
    return this.getByTestId(MMConnectDappTestIds.RM_APP_TITLE);
  }

  get connectButton(): EncapsulatedElementType {
    return this.getByTestId(MMConnectDappTestIds.CONNECT_BUTTON);
  }

  get disconnectButton(): EncapsulatedElementType {
    return this.getByTestId(MMConnectDappTestIds.DISCONNECT_BUTTON);
  }

  get scopesSection(): EncapsulatedElementType {
    return this.getByTestId(MMConnectDappTestIds.SCOPES_SECTION);
  }

  get errorSection(): EncapsulatedElementType {
    return this.getByTestId(MMConnectDappTestIds.ERROR_SECTION);
  }

  get connectLegacyButton(): EncapsulatedElementType {
    return this.getByTestId(MMConnectDappTestIds.CONNECT_BUTTON_LEGACY);
  }

  // Legacy EVM selectors
  get legacyEvmCard(): EncapsulatedElementType {
    return this.getByTestId(MMConnectDappTestIds.LEGACY_EVM_CARD);
  }

  get legacyEvmChainIdValue(): EncapsulatedElementType {
    return this.getByTestId(MMConnectDappTestIds.LEGACY_EVM_CHAIN_ID_VALUE);
  }

  get legacyEvmAccountsValue(): EncapsulatedElementType {
    return this.getByTestId(MMConnectDappTestIds.LEGACY_EVM_ACCOUNTS_VALUE);
  }

  get legacyEvmActiveAccount(): EncapsulatedElementType {
    return this.getByTestId(MMConnectDappTestIds.LEGACY_EVM_ACTIVE_ACCOUNT);
  }

  get legacyEvmResponseText(): EncapsulatedElementType {
    return this.getByTestId(MMConnectDappTestIds.LEGACY_EVM_RESPONSE_TEXT);
  }

  get legacyEvmBtnPersonalSign(): EncapsulatedElementType {
    return this.getByTestId(MMConnectDappTestIds.LEGACY_EVM_BTN_PERSONAL_SIGN);
  }

  get legacyEvmBtnSendTransaction(): EncapsulatedElementType {
    return this.getByTestId(
      MMConnectDappTestIds.LEGACY_EVM_BTN_SEND_TRANSACTION,
    );
  }

  get legacyEvmBtnSwitchPolygon(): EncapsulatedElementType {
    return this.getByTestId(MMConnectDappTestIds.LEGACY_EVM_BTN_SWITCH_POLYGON);
  }

  // Dynamic selectors
  getNetworkCheckbox(caipChainId: string): EncapsulatedElementType {
    return this.getByTestId(
      `dynamic-inputs-checkbox-${escapeTestId(caipChainId)}`,
    );
  }

  getScopeCard(scope: string): EncapsulatedElementType {
    return this.getByTestId(
      `${MMConnectDappTestIds.SCOPE_CARD}-${escapeTestId(scope)}`,
    );
  }

  getScopeNetworkName(scope: string): EncapsulatedElementType {
    return this.getByTestId(
      `${MMConnectDappTestIds.SCOPE_CARD_NETWORK_NAME}-${escapeTestId(scope)}`,
    );
  }

  getMethodSelect(scope: string): EncapsulatedElementType {
    return this.getByTestId(
      `${MMConnectDappTestIds.SCOPE_CARD_METHOD_SELECT}-${escapeTestId(scope)}`,
    );
  }

  getInvokeButton(scope: string): EncapsulatedElementType {
    return this.getByTestId(
      `${MMConnectDappTestIds.SCOPE_CARD_INVOKE_BTN}-${escapeTestId(scope)}`,
    );
  }

  getResultCode(
    scope: string,
    method: string,
    index = 0,
  ): EncapsulatedElementType {
    const escapedScope = escapeTestId(scope);
    const escapedMethod = escapeTestId(method);
    return this.getByTestId(
      `${MMConnectDappTestIds.SCOPE_CARD_RESULT_CODE}-${escapedScope}-${escapedMethod}-${index}`,
    );
  }

  getResultStatus(
    scope: string,
    method: string,
    index = 0,
  ): EncapsulatedElementType {
    const escapedScope = escapeTestId(scope);
    const escapedMethod = escapeTestId(method);
    return this.getByTestId(
      `${MMConnectDappTestIds.SCOPE_CARD_RESULT_STATUS}-${escapedScope}-${escapedMethod}-${index}`,
    );
  }

  // App lifecycle
  async switchToPlayground(): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        const drv = getDriver();
        await drv.execute('mobile: activateApp', {
          appId: PLAYGROUND_PACKAGE_ID,
        });
        await sleep(1000);
      },
    });
  }

  async waitForPlaygroundReady(timeoutMs = 15000): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        const element = await asPlaywrightElement(this.appContainer);
        await element.waitForDisplayed({
          timeout: timeoutMs,
          timeoutMsg:
            'RNPlaygroundDapp: app container not visible (playground not ready)',
        });
      },
    });
  }

  async ensureInPlayground(): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        try {
          const element = await asPlaywrightElement(this.appContainer);
          await element.waitForDisplayed({
            timeout: 3000,
            timeoutMsg:
              'RNPlaygroundDapp: app container not visible (will switch to playground)',
          });
        } catch {
          await this.switchToPlayground();
          await this.waitForPlaygroundReady();
        }
      },
    });
  }

  // Simple actions
  async tapNetworkCheckbox(caipChainId: string): Promise<void> {
    await UnifiedGestures.tap(this.getNetworkCheckbox(caipChainId));
  }

  async tapConnect(): Promise<void> {
    await UnifiedGestures.tap(this.connectButton);
  }

  async tapConnectLegacy(): Promise<void> {
    await UnifiedGestures.tap(this.connectLegacyButton);
  }

  async tapDisconnect(): Promise<void> {
    await UnifiedGestures.tap(this.disconnectButton);
  }

  async tapInvoke(scope: string): Promise<void> {
    await UnifiedGestures.tap(this.getInvokeButton(scope));
  }

  async tapLegacyEvmButton(
    buttonGetter: EncapsulatedElementType,
  ): Promise<void> {
    await UnifiedGestures.tap(buttonGetter);
  }

  // Complex actions
  async selectMethod(
    scope: string,
    methodName: string,
    maxScrollAttempts = 10,
  ): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        await UnifiedGestures.tap(this.getMethodSelect(scope));
        await sleep(500);

        const drv = getDriver();

        for (let attempt = 0; attempt < maxScrollAttempts; attempt++) {
          try {
            const option =
              await PlaywrightMatchers.getElementByText(methodName);
            const isVisible = await option.isVisible();
            if (isVisible) {
              await option.click();
              await sleep(500);
              return;
            }
          } catch {
            // Option not found or not visible yet
          }

          await drv.execute('mobile: swipeGesture', {
            left: 100,
            top: 400,
            width: 600,
            height: 600,
            direction: 'down',
            percent: 0.3,
          });
          await sleep(300);
        }

        throw new Error(
          `Method "${methodName}" not found in picker after ${maxScrollAttempts} scroll attempts`,
        );
      },
    });
  }

  async scrollToElement(
    elemGetter: EncapsulatedElementType,
    scrollParams: { scrollParams?: { direction?: 'up' | 'down' } } = {},
  ): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        const elem = await asPlaywrightElement(elemGetter);
        await PlaywrightGestures.scrollIntoView(elem, scrollParams);
      },
    });
  }

  // Assertions
  async assertConnected(): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        const element = await asPlaywrightElement(this.scopesSection);
        await element.waitForDisplayed({
          timeout: 15000,
          timeoutMsg:
            'RNPlaygroundDapp: scopes section not visible (expected connected)',
        });
      },
    });
  }

  async assertDisconnected(): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        const element = await asPlaywrightElement(this.connectButton);
        await element.waitForDisplayed({
          timeout: 15000,
          timeoutMsg:
            'RNPlaygroundDapp: connect button not visible (expected disconnected)',
        });
      },
    });
  }

  async assertScopeCardVisible(scope: string): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        const element = await asPlaywrightElement(this.getScopeCard(scope));
        await element.waitForDisplayed({
          timeout: 15000,
          timeoutMsg: `RNPlaygroundDapp: scope card "${scope}" not visible`,
        });
      },
    });
  }

  async waitForResult(scope: string, method: string, index = 0): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        const element = await asPlaywrightElement(
          this.getResultCode(scope, method, index),
        );
        await element.waitForDisplayed({
          timeout: 15000,
          timeoutMsg: `RNPlaygroundDapp: result code for ${scope}/${method}[${index}] not visible`,
        });
      },
    });
  }

  async assertLegacyEvmConnected(): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        const element = await asPlaywrightElement(this.legacyEvmCard);
        await element.waitForDisplayed({
          timeout: 15000,
          timeoutMsg: 'Legacy EVM card not found',
        });
      },
    });
  }

  async assertLegacyEvmHasAccounts(timeoutMs = 10000): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        const element = await asPlaywrightElement(this.legacyEvmAccountsValue);
        await element.waitForDisplayed({
          timeout: timeoutMs,
          timeoutMsg: 'RNPlaygroundDapp: legacy EVM accounts value not visible',
        });
      },
    });
  }

  async assertLegacyEvmActiveAccount(timeoutMs = 10000): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        const element = await asPlaywrightElement(this.legacyEvmActiveAccount);
        await element.waitForDisplayed({
          timeout: timeoutMs,
          timeoutMsg: 'RNPlaygroundDapp: legacy EVM active account not visible',
        });
      },
    });
  }

  async getLegacyEvmChainId(): Promise<string> {
    const element = await asPlaywrightElement(this.legacyEvmChainIdValue);
    await element.waitForDisplayed({
      timeout: 10000,
      timeoutMsg: 'RNPlaygroundDapp: legacy EVM chain ID value not visible',
    });
    return (await element.textContent()) ?? '';
  }

  async getLegacyEvmResponseText(): Promise<string> {
    const element = await asPlaywrightElement(this.legacyEvmResponseText);
    return (await element.textContent()) ?? '';
  }

  async assertResultCodeContains(
    scope: string,
    method: string,
    expectedText: string,
    index = 0,
    timeoutMs = 15000,
  ): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        const element = await asPlaywrightElement(
          this.getResultCode(scope, method, index),
        );
        await element.waitForDisplayed({
          timeout: timeoutMs,
          timeoutMsg: `RNPlaygroundDapp: result code for ${scope}/${method}[${index}] not visible`,
        });
        const text = await element.textContent();
        expect(text).toContain(expectedText);
      },
    });
  }
}

export default new RNPlaygroundDapp();
