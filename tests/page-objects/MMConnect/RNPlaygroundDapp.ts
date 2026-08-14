import Assertions from '../../framework/Assertions';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import Utilities, {
  getDriver,
  sleep,
  type EncapsulatedElementType,
  type PlaywrightElement,
} from '../../framework';
import { PLAYGROUND_PACKAGE_ID } from '../../framework/Constants';
import PlaywrightUtilities from '../../framework/PlaywrightUtilities';
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
    return Matchers.getElementByID(testId);
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
    const drv = getDriver();
    await drv.execute('mobile: activateApp', {
      appId: PLAYGROUND_PACKAGE_ID,
    });
    await sleep(1000);
  }

  async waitForPlaygroundReady(timeoutMs = 15000): Promise<void> {
    await Assertions.expectElementToBeVisible(this.appContainer, {
      timeout: timeoutMs,
      description:
        'RNPlaygroundDapp: app container not visible (playground not ready)',
    });
  }

  async ensureInPlayground(): Promise<void> {
    try {
      await Assertions.expectElementToBeVisible(this.appContainer, {
        timeout: 3000,
        description:
          'RNPlaygroundDapp: app container not visible (will switch to playground)',
      });
    } catch {
      await this.switchToPlayground();
      await this.waitForPlaygroundReady();
    }
  }

  // Simple actions
  async tapNetworkCheckbox(caipChainId: string): Promise<void> {
    await Gestures.tap(this.getNetworkCheckbox(caipChainId), {
      elemDescription: `RNPlayground network checkbox ${caipChainId}`,
    });
  }

  async tapConnect(): Promise<void> {
    await Gestures.tap(this.connectButton, {
      elemDescription: 'RNPlayground connect',
    });
  }

  async tapConnectLegacy(): Promise<void> {
    await Gestures.tap(this.connectLegacyButton, {
      elemDescription: 'RNPlayground connect legacy',
    });
  }

  async tapDisconnect(): Promise<void> {
    await Gestures.tap(this.disconnectButton, {
      elemDescription: 'RNPlayground disconnect',
    });
  }

  async tapInvoke(scope: string): Promise<void> {
    await Gestures.waitAndTap(this.getInvokeButton(scope), {
      elemDescription: `RNPlayground invoke ${scope}`,
    });
  }

  async tapLegacyEvmButton(
    buttonGetter: EncapsulatedElementType,
  ): Promise<void> {
    await Gestures.waitAndTap(buttonGetter, {
      elemDescription: 'RNPlayground legacy EVM button',
    });
  }

  // Complex actions
  async selectMethod(
    scope: string,
    methodName: string,
    maxScrollAttempts = 10,
    minScrollAttempts = 0,
    direction: 'up' | 'down' = 'up',
  ): Promise<void> {
    const { width, height } = await PlaywrightUtilities.getDeviceScreenSize();
    const amountToScroll = direction === 'up' ? 600 : -600;
    const from = { x: width / 2, y: height / 2 };
    const to = { x: width / 2, y: height / 2 - amountToScroll };
    const drv = getDriver();

    await Gestures.waitAndTap(this.getMethodSelect(scope), {
      delay: 1000,
      elemDescription: `RNPlayground method select ${scope}`,
    });
    await sleep(700);

    // We scroll right away as we know from the test flow that we can scroll right away.
    if (minScrollAttempts > 0) {
      for (let attempt = 0; attempt < minScrollAttempts; attempt++) {
        await drv.swipe({
          direction,
          duration: 200,
          from,
          to,
        });
      }
    }

    for (let attempt = 0; attempt < maxScrollAttempts; attempt++) {
      try {
        const option = Matchers.getElementByText(methodName);
        const resolved = (await Promise.resolve(option)) as PlaywrightElement;
        const isVisible = await resolved.isVisible();
        if (isVisible) {
          await Gestures.tap(option, {
            elemDescription: `RNPlayground method option ${methodName}`,
          });
          await sleep(500);
          return;
        }
      } catch {
        // Option not found or not visible yet
      }

      await drv.swipe({
        direction,
        duration: 200,
        from,
        to,
      });
      await sleep(300);
    }

    throw new Error(
      `Method "${methodName}" not found in picker after ${maxScrollAttempts} scroll attempts`,
    );
  }

  /**
   * Scroll an element into view with making sure it's fully visible.
   * @param elemGetter - The element to scroll to
   * @param options - WDIO scroll options (scrollParams / percent) used by MMConnect specs
   */
  async scrollToElement(
    elemGetter: EncapsulatedElementType,
    options?: {
      scrollParams?: { direction?: 'up' | 'down' | 'left' | 'right' };
      percent?: number;
      maxScrolls?: number;
      from?: { x: number; y: number };
      to?: { x: number; y: number };
    },
  ): Promise<void> {
    await Gestures.scrollIntoViewFullyVisible(elemGetter, {
      direction: options?.scrollParams?.direction ?? 'down',
      percent: options?.percent,
      maxScrolls: options?.maxScrolls,
      from: options?.from,
      to: options?.to,
    });
  }

  // Assertions
  async assertConnected(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.scopesSection, {
      timeout: 15000,
      description:
        'RNPlaygroundDapp: scopes section not visible (expected connected)',
    });
  }

  async assertDisconnected(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.connectButton, {
      timeout: 15000,
      description:
        'RNPlaygroundDapp: connect button not visible (expected disconnected)',
    });
  }

  async assertScopeCardVisible(scope: string): Promise<void> {
    await Assertions.expectElementToBeVisible(this.getScopeCard(scope), {
      timeout: 15000,
      description: `RNPlaygroundDapp: scope card "${scope}" not visible`,
    });
  }

  async waitForResult(scope: string, method: string, index = 0): Promise<void> {
    await Assertions.expectElementToBeVisible(
      this.getResultCode(scope, method, index),
      {
        timeout: 15000,
        description: `RNPlaygroundDapp: result code for ${scope}/${method}[${index}] not visible`,
      },
    );
  }

  async assertLegacyEvmConnected(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.legacyEvmCard, {
      timeout: 15000,
      description: 'Legacy EVM card not found',
    });
  }

  async assertLegacyEvmHasAccounts(timeoutMs = 10000): Promise<void> {
    await Assertions.expectElementToBeVisible(this.legacyEvmAccountsValue, {
      timeout: timeoutMs,
      description: 'RNPlaygroundDapp: legacy EVM accounts value not visible',
    });
  }

  async assertLegacyEvmActiveAccount(timeoutMs = 10000): Promise<void> {
    await Assertions.expectElementToBeVisible(this.legacyEvmActiveAccount, {
      timeout: timeoutMs,
      description: 'RNPlaygroundDapp: legacy EVM active account not visible',
    });
  }

  async getLegacyEvmChainId(): Promise<string> {
    await Assertions.expectElementToBeVisible(this.legacyEvmChainIdValue, {
      timeout: 10000,
      description: 'RNPlaygroundDapp: legacy EVM chain ID value not visible',
    });
    return Utilities.getElementText(this.legacyEvmChainIdValue);
  }

  async getLegacyEvmResponseText(): Promise<string> {
    return Utilities.getElementText(this.legacyEvmResponseText);
  }

  async assertResultCodeContains(
    scope: string,
    method: string,
    expectedText: string,
    index = 0,
    timeoutMs = 15000,
  ): Promise<void> {
    const result = this.getResultCode(scope, method, index);
    await Assertions.expectElementToBeVisible(result, {
      timeout: timeoutMs,
      description: `RNPlaygroundDapp: result code for ${scope}/${method}[${index}] not visible`,
    });
    await Utilities.executeWithRetry(
      async () => {
        const text = await Utilities.getElementText(result);
        if (!text.includes(expectedText)) {
          throw new Error(`Expected "${expectedText}" in "${text}"`);
        }
      },
      {
        timeout: timeoutMs,
        description: `RNPlaygroundDapp: result code should contain "${expectedText}"`,
      },
    );
  }
}

export default new RNPlaygroundDapp();
