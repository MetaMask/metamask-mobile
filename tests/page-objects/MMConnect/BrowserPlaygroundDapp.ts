import Assertions from '../../framework/Assertions';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import {
  Utilities,
  sleep,
  type EncapsulatedElementType,
} from '../../framework';
import { MMConnectDappTestIds } from '../../selectors/MMConnect/MMConnectDapp.testIds';

class BrowserPlaygroundDapp {
  /**
   * Get an element by data-testid.
   * @param testId - The data-testid of the element to get.
   * @param lazy - Whether to get a lazy element. Lazy elements are not required to be present in the DOM. This is useful for negative assertions where the element may never have been rendered (e.g. waitForDisplayed({ reverse: true })).
   * @returns The encapsulated element.
   */
  private getByDataTestId(
    testId: string,
    { lazy = false }: { lazy?: boolean } = {},
  ): EncapsulatedElementType {
    const xpath = `//*[@data-testid="${testId}"]`;
    return lazy
      ? Matchers.getLazyElementByNativeXPath(xpath)
      : Matchers.getElementByNativeXPath(xpath);
  }

  // App-level selectors
  get connectLegacyButton(): EncapsulatedElementType {
    return this.getByDataTestId(MMConnectDappTestIds.CONNECT_BUTTON_LEGACY);
  }

  get disconnectButton(): EncapsulatedElementType {
    return this.getByDataTestId(MMConnectDappTestIds.DISCONNECT_BUTTON);
  }

  get errorSection(): EncapsulatedElementType {
    return this.getByDataTestId(MMConnectDappTestIds.ERROR_SECTION);
  }

  get connectButton(): EncapsulatedElementType {
    return this.getByDataTestId(MMConnectDappTestIds.CONNECT_BUTTON);
  }

  get connectedScopesSection(): EncapsulatedElementType {
    return this.getByDataTestId(MMConnectDappTestIds.SCOPES_SECTION);
  }

  // Legacy EVM selectors
  get legacyEvmCard(): EncapsulatedElementType {
    return this.getByDataTestId(MMConnectDappTestIds.LEGACY_EVM_CARD);
  }

  get chainIdValue(): EncapsulatedElementType {
    return this.getByDataTestId(MMConnectDappTestIds.LEGACY_EVM_CHAIN_ID_VALUE);
  }

  get accountsValue(): EncapsulatedElementType {
    return this.getByDataTestId(MMConnectDappTestIds.LEGACY_EVM_ACCOUNTS_VALUE);
  }

  get activeAccount(): EncapsulatedElementType {
    return this.getByDataTestId(MMConnectDappTestIds.LEGACY_EVM_ACTIVE_ACCOUNT);
  }

  get responseText(): EncapsulatedElementType {
    return this.getByDataTestId(MMConnectDappTestIds.LEGACY_EVM_RESPONSE_TEXT);
  }

  get personalSignButton(): EncapsulatedElementType {
    return this.getByDataTestId(
      MMConnectDappTestIds.LEGACY_EVM_BTN_PERSONAL_SIGN,
    );
  }

  get signTypedDataV4Button(): EncapsulatedElementType {
    return this.getByDataTestId(
      MMConnectDappTestIds.LEGACY_EVM_BTN_SIGN_TYPED_DATA_V4,
    );
  }

  get sendTransactionButton(): EncapsulatedElementType {
    return this.getByDataTestId(
      MMConnectDappTestIds.LEGACY_EVM_BTN_SEND_TRANSACTION,
    );
  }

  get switchToMainnetButton(): EncapsulatedElementType {
    return this.getByDataTestId(
      MMConnectDappTestIds.LEGACY_EVM_BTN_SWITCH_MAINNET,
    );
  }

  get switchToPolygonButton(): EncapsulatedElementType {
    return this.getByDataTestId(
      MMConnectDappTestIds.LEGACY_EVM_BTN_SWITCH_POLYGON,
    );
  }

  get switchToGoerliButton(): EncapsulatedElementType {
    return this.getByDataTestId(
      MMConnectDappTestIds.LEGACY_EVM_BTN_SWITCH_GOERLI,
    );
  }

  get getBalanceButton(): EncapsulatedElementType {
    return this.getByDataTestId(
      MMConnectDappTestIds.LEGACY_EVM_BTN_GET_BALANCE,
    );
  }

  get blockNumberButton(): EncapsulatedElementType {
    return this.getByDataTestId(
      MMConnectDappTestIds.LEGACY_EVM_BTN_BLOCK_NUMBER,
    );
  }

  get gasPriceButton(): EncapsulatedElementType {
    return this.getByDataTestId(MMConnectDappTestIds.LEGACY_EVM_BTN_GAS_PRICE);
  }

  // Wagmi selectors
  get connectWagmiButton(): EncapsulatedElementType {
    return this.getByDataTestId(MMConnectDappTestIds.WAGMI_CONNECT_BUTTON);
  }

  get wagmiDisconnectButton(): EncapsulatedElementType {
    return this.getByDataTestId(MMConnectDappTestIds.WAGMI_DISCONNECT_BUTTON);
  }

  get wagmiCard(): EncapsulatedElementType {
    return this.getByDataTestId(MMConnectDappTestIds.WAGMI_CARD);
  }

  get wagmiChainIdValue(): EncapsulatedElementType {
    return this.getByDataTestId(MMConnectDappTestIds.WAGMI_CHAIN_ID_VALUE);
  }

  get wagmiAccountValue(): EncapsulatedElementType {
    return this.getByDataTestId(MMConnectDappTestIds.WAGMI_ACCOUNT_VALUE);
  }

  get wagmiActiveAccount(): EncapsulatedElementType {
    return this.getByDataTestId(MMConnectDappTestIds.WAGMI_ACTIVE_ACCOUNT);
  }

  get wagmiBalanceValue(): EncapsulatedElementType {
    return this.getByDataTestId(MMConnectDappTestIds.WAGMI_BALANCE_VALUE);
  }

  get wagmiSignMessageInput(): EncapsulatedElementType {
    return this.getByDataTestId(MMConnectDappTestIds.WAGMI_INPUT_MESSAGE);
  }

  get wagmiSignMessageButton(): EncapsulatedElementType {
    return this.getByDataTestId(MMConnectDappTestIds.WAGMI_BUTTON_SIGN_MESSAGE);
  }

  get wagmiSignatureResult(): EncapsulatedElementType {
    return this.getByDataTestId(MMConnectDappTestIds.WAGMI_SIGNATURE_RESULT);
  }

  get wagmiSendTxToAddressInput(): EncapsulatedElementType {
    return this.getByDataTestId(MMConnectDappTestIds.WAGMI_INPUT_TO_ADDRESS);
  }

  get wagmiSendTxAmountInput(): EncapsulatedElementType {
    return this.getByDataTestId(MMConnectDappTestIds.WAGMI_INPUT_AMOUNT);
  }

  get wagmiSendTransactionButton(): EncapsulatedElementType {
    return this.getByDataTestId(
      MMConnectDappTestIds.WAGMI_BUTTON_SEND_TRANSACTION,
    );
  }

  get wagmiTxHashResult(): EncapsulatedElementType {
    return this.getByDataTestId(MMConnectDappTestIds.WAGMI_TX_HASH_RESULT);
  }

  getWagmiSwitchChainButton(chainId: number): EncapsulatedElementType {
    return this.getByDataTestId(
      `${MMConnectDappTestIds.WAGMI_BTN_SWITCH_CHAIN}-${chainId}`,
    );
  }

  // Solana selectors
  get solanaCard(): EncapsulatedElementType {
    return this.getByDataTestId(MMConnectDappTestIds.SOLANA_CARD);
  }

  get solanaConnectButton(): EncapsulatedElementType {
    return this.getByDataTestId(MMConnectDappTestIds.SOLANA_CONNECT_BUTTON);
  }

  get solanaDisconnectButton(): EncapsulatedElementType {
    return this.getByDataTestId(MMConnectDappTestIds.SOLANA_DISCONNECT_BUTTON);
  }

  get solanaAddressContainer(): EncapsulatedElementType {
    return this.getByDataTestId(MMConnectDappTestIds.SOLANA_ADDRESS_CONTAINER);
  }

  get solanaSignMessageButton(): EncapsulatedElementType {
    return this.getByDataTestId(
      MMConnectDappTestIds.SOLANA_SIGN_MESSAGE_BUTTON,
    );
  }

  get solanaSignedMessageResult(): EncapsulatedElementType {
    return this.getByDataTestId(
      MMConnectDappTestIds.SOLANA_SIGNED_MESSAGE_RESULT,
    );
  }

  getScopeCard(
    scope: string,
    { lazy = false }: { lazy?: boolean } = {},
  ): EncapsulatedElementType {
    const escapedScope = scope.toLowerCase().replace(/:/g, '-');
    return this.getByDataTestId(
      `${MMConnectDappTestIds.SCOPE_CARD}-${escapedScope}`,
      { lazy },
    );
  }

  // Tap actions
  async tapConnectLegacy(): Promise<void> {
    await Gestures.waitAndTap(this.connectLegacyButton, {
      elemDescription: 'BrowserPlayground connect legacy',
    });
  }

  async tapDisconnect(): Promise<void> {
    await Gestures.waitAndTap(this.disconnectButton, {
      elemDescription: 'BrowserPlayground disconnect',
    });
  }

  async tapPersonalSign(): Promise<void> {
    await Gestures.waitAndTap(this.personalSignButton, {
      elemDescription: 'BrowserPlayground personal sign',
    });
  }

  async tapSignTypedDataV4(): Promise<void> {
    await Gestures.waitAndTap(this.signTypedDataV4Button, {
      elemDescription: 'BrowserPlayground sign typed data v4',
    });
  }

  async tapSendTransaction(): Promise<void> {
    await Gestures.waitAndTap(this.sendTransactionButton, {
      elemDescription: 'BrowserPlayground send transaction',
    });
  }

  async tapSwitchToMainnet(): Promise<void> {
    await Gestures.waitAndTap(this.switchToMainnetButton, {
      elemDescription: 'BrowserPlayground switch mainnet',
    });
  }

  async tapSwitchToPolygon(): Promise<void> {
    await Gestures.waitAndTap(this.switchToPolygonButton, {
      elemDescription: 'BrowserPlayground switch polygon',
    });
  }

  async tapSwitchToGoerli(): Promise<void> {
    await Gestures.waitAndTap(this.switchToGoerliButton, {
      elemDescription: 'BrowserPlayground switch goerli',
    });
  }

  async tapGetBalance(): Promise<void> {
    await Gestures.waitAndTap(this.getBalanceButton, {
      elemDescription: 'BrowserPlayground get balance',
    });
  }

  async tapConnectWagmi(): Promise<void> {
    await Gestures.waitAndTap(this.connectWagmiButton, {
      elemDescription: 'BrowserPlayground wagmi connect',
    });
  }

  async tapWagmiDisconnect(): Promise<void> {
    await Gestures.waitAndTap(this.wagmiDisconnectButton, {
      elemDescription: 'BrowserPlayground wagmi disconnect',
    });
  }

  async tapWagmiSignMessage({
    shouldCooldown = false,
    timeToCooldown = 1000,
  }: {
    shouldCooldown?: boolean;
    timeToCooldown?: number;
  } = {}): Promise<void> {
    await Gestures.waitAndTap(this.wagmiSignMessageButton, {
      delay: 2000, // Make sure the keyboard dismiss animation is complete
      elemDescription: 'BrowserPlayground wagmi sign message',
    });
    if (shouldCooldown) {
      await sleep(timeToCooldown);
    }
  }

  async tapWagmiSendTransaction(): Promise<void> {
    await Gestures.waitAndTap(this.wagmiSendTransactionButton, {
      elemDescription: 'BrowserPlayground wagmi send transaction',
    });
  }

  async tapWagmiSwitchChain(chainId: number): Promise<void> {
    await Gestures.waitAndTap(this.getWagmiSwitchChainButton(chainId), {
      elemDescription: `BrowserPlayground wagmi switch chain ${chainId}`,
    });
  }

  async typeWagmiSignMessage(message: string): Promise<void> {
    await Gestures.typeText(this.wagmiSignMessageInput, message, {
      elemDescription: 'BrowserPlayground wagmi sign message input',
    });
  }

  async tapSolanaConnect(): Promise<void> {
    await Gestures.waitAndTap(this.solanaConnectButton, {
      delay: 750, // Cooldown period for the button tap
      elemDescription: 'BrowserPlayground solana connect',
    });
  }

  async tapSolanaDisconnect(): Promise<void> {
    await Gestures.waitAndTap(this.solanaDisconnectButton, {
      elemDescription: 'BrowserPlayground solana disconnect',
    });
  }

  async tapSolanaSignMessage(): Promise<void> {
    await Gestures.waitAndTap(this.solanaSignMessageButton, {
      elemDescription: 'BrowserPlayground solana sign message',
    });
  }

  async tapConnect(): Promise<void> {
    await Gestures.waitAndTap(this.connectButton, {
      elemDescription: 'BrowserPlayground connect',
    });
  }

  async waitForConnectButtonVisible(timeoutMs = 15000): Promise<void> {
    await Gestures.scrollIntoView(this.connectButton);
    await Assertions.expectElementToBeVisible(this.connectButton, {
      timeout: timeoutMs,
      description: 'BrowserPlaygroundDapp: connect button not visible',
    });
  }

  // Assertions
  async assertConnected(isConnected = true): Promise<void> {
    if (isConnected) {
      await Assertions.expectElementToBeVisible(this.activeAccount, {
        timeout: 10000,
        description:
          'BrowserPlaygroundDapp: active account not visible (expected connected)',
      });
    } else {
      await Assertions.expectElementToBeVisible(this.connectLegacyButton, {
        timeout: 10000,
        description:
          'BrowserPlaygroundDapp: connect legacy button not visible (expected disconnected)',
      });
    }
  }

  async assertChainIdValue(expectedChainId: string): Promise<void> {
    await this.assertElementContainsText(
      this.chainIdValue,
      expectedChainId,
      `BrowserPlaygroundDapp: chain id should contain "${expectedChainId}"`,
    );
  }

  async assertResponseValue(expectedValue: string): Promise<void> {
    await this.assertElementContainsText(
      this.responseText,
      expectedValue,
      `BrowserPlaygroundDapp: response should contain "${expectedValue}"`,
    );
  }

  async assertActiveAccount(expectedAccount: string): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        const text = await Utilities.getElementText(this.activeAccount);
        if (!text.toLowerCase().includes(expectedAccount.toLowerCase())) {
          throw new Error(
            `Expected active account to contain "${expectedAccount}", got "${text}"`,
          );
        }
      },
      {
        timeout: 15000,
        description: `BrowserPlaygroundDapp: active account should contain "${expectedAccount}"`,
      },
    );
  }

  async assertAccountsCount(expectedCount: number): Promise<void> {
    await this.assertElementContainsText(
      this.accountsValue,
      `${expectedCount} available`,
      `BrowserPlaygroundDapp: accounts should contain "${expectedCount} available"`,
    );
  }

  async isConnected(): Promise<boolean> {
    const maxRetries = 5;
    for (let i = 0; i < maxRetries; i++) {
      try {
        await Assertions.expectElementToBeVisible(this.activeAccount, {
          timeout: 5000,
          description:
            'BrowserPlaygroundDapp: active account not visible (isConnected check)',
        });
        return true;
      } catch {
        console.log(
          `BrowserPlaygroundDapp: active account not visible on attempt ${i + 1}`,
        );
        await sleep(1000);
      }
    }
    return false;
  }

  async assertWagmiConnected(isConnected = true): Promise<void> {
    if (isConnected) {
      await Assertions.expectElementToBeVisible(this.wagmiActiveAccount, {
        timeout: 10000,
        description:
          'BrowserPlaygroundDapp: wagmi active account not visible (expected connected)',
      });
    } else {
      await Assertions.expectElementToBeVisible(this.connectWagmiButton, {
        timeout: 10000,
        description:
          'BrowserPlaygroundDapp: wagmi connect button not visible (expected disconnected)',
      });
    }
  }

  async assertWagmiChainIdValue(
    expectedChainId: string | number,
  ): Promise<void> {
    await this.assertElementContainsText(
      this.wagmiChainIdValue,
      String(expectedChainId),
      `BrowserPlaygroundDapp: wagmi chain id should contain "${expectedChainId}"`,
    );
  }

  async assertWagmiActiveAccount(expectedAccount: string): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        const text = await Utilities.getElementText(this.wagmiActiveAccount);
        if (!text.toLowerCase().includes(expectedAccount.toLowerCase())) {
          throw new Error(
            `Expected wagmi active account to contain "${expectedAccount}", got "${text}"`,
          );
        }
      },
      {
        timeout: 15000,
        description: `BrowserPlaygroundDapp: wagmi active account should contain "${expectedAccount}"`,
      },
    );
  }

  async assertWagmiSignatureResult(expectedValue: string): Promise<void> {
    await this.assertElementContainsText(
      this.wagmiSignatureResult,
      expectedValue,
      `BrowserPlaygroundDapp: wagmi signature should contain "${expectedValue}"`,
    );
  }

  async isWagmiConnected(): Promise<boolean> {
    try {
      await Assertions.expectElementToBeVisible(this.wagmiActiveAccount, {
        timeout: 5000,
        description:
          'BrowserPlaygroundDapp: wagmi active account not visible (isWagmiConnected check)',
      });
      return true;
    } catch {
      return false;
    }
  }

  async assertSolanaConnected(isConnected = true): Promise<void> {
    if (isConnected) {
      await Assertions.expectElementToBeVisible(this.solanaCard, {
        timeout: 10000,
        description:
          'BrowserPlaygroundDapp: solana card not visible (expected connected)',
      });
    } else {
      await Assertions.expectElementToBeVisible(this.solanaConnectButton, {
        timeout: 10000,
        description:
          'BrowserPlaygroundDapp: solana connect button not visible (expected disconnected)',
      });
    }
  }

  async assertSolanaActiveAccount(expectedAddress: string): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        const text = await Utilities.getElementText(
          this.solanaAddressContainer,
        );
        if (!text.toLowerCase().includes(expectedAddress.toLowerCase())) {
          throw new Error(
            `Expected solana address to contain "${expectedAddress}", got "${text}"`,
          );
        }
      },
      {
        timeout: 15000,
        description: `BrowserPlaygroundDapp: solana address should contain "${expectedAddress}"`,
      },
    );
  }

  async assertSolanaSignedMessageResult(expectedValue: string): Promise<void> {
    await Assertions.expectElementToBeVisible(this.solanaSignedMessageResult, {
      timeout: 10000,
      description:
        'BrowserPlaygroundDapp: solana signed message result not visible',
    });
    await this.assertElementContainsText(
      this.solanaSignedMessageResult,
      expectedValue,
      `BrowserPlaygroundDapp: solana signed message should contain "${expectedValue}"`,
    );
  }

  async assertMultichainConnected(isConnected = true): Promise<void> {
    if (isConnected) {
      await Assertions.expectElementToBeVisible(this.connectedScopesSection, {
        timeout: 10000,
        description:
          'BrowserPlaygroundDapp: scopes section not visible (expected multichain connected)',
      });
    } else {
      await Assertions.expectElementToBeVisible(this.connectButton, {
        timeout: 10000,
        description:
          'BrowserPlaygroundDapp: connect button not visible (expected multichain disconnected)',
      });
    }
  }

  async assertScopeCardVisible(scope: string): Promise<void> {
    await Assertions.expectElementToBeVisible(this.getScopeCard(scope), {
      timeout: 10000,
      description: `BrowserPlaygroundDapp: scope card "${scope}" not visible`,
    });
  }

  async assertScopeCardNotVisible(scope: string): Promise<void> {
    await Assertions.expectElementToNotBeVisible(
      this.getScopeCard(scope, { lazy: true }),
      {
        timeout: 10000,
        description: `BrowserPlaygroundDapp: scope card "${scope}" is visible (expected not displayed)`,
      },
    );
  }

  private async assertElementContainsText(
    elem: EncapsulatedElementType,
    expected: string,
    description: string,
  ): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        const text = await Utilities.getElementText(elem);
        if (!text.includes(expected)) {
          throw new Error(`Expected "${expected}" in "${text}"`);
        }
      },
      {
        timeout: 15000,
        description,
      },
    );
  }
}

export default new BrowserPlaygroundDapp();
