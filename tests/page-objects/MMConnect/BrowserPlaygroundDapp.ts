import {
  encapsulated,
  EncapsulatedElementType,
  asPlaywrightElement,
} from '../../framework/EncapsulatedElement';
import { encapsulatedAction } from '../../framework/encapsulatedAction';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class BrowserPlaygroundDapp {
  private getByDataTestId(testId: string): EncapsulatedElementType {
    return encapsulated({
      appium: () =>
        PlaywrightMatchers.getElementByXPath(`//*[@data-testid="${testId}"]`),
    });
  }

  // App-level selectors
  get connectLegacyButton(): EncapsulatedElementType {
    return this.getByDataTestId('app-btn-connect-legacy');
  }

  get disconnectButton(): EncapsulatedElementType {
    return this.getByDataTestId('app-btn-disconnect');
  }

  get errorSection(): EncapsulatedElementType {
    return this.getByDataTestId('app-section-error');
  }

  get connectButton(): EncapsulatedElementType {
    return this.getByDataTestId('app-btn-connect');
  }

  get connectedScopesSection(): EncapsulatedElementType {
    return this.getByDataTestId('app-section-scopes');
  }

  // Legacy EVM selectors
  get legacyEvmCard(): EncapsulatedElementType {
    return this.getByDataTestId('legacy-evm-card');
  }

  get chainIdValue(): EncapsulatedElementType {
    return this.getByDataTestId('legacy-evm-chain-id-value');
  }

  get accountsValue(): EncapsulatedElementType {
    return this.getByDataTestId('legacy-evm-accounts-value');
  }

  get activeAccount(): EncapsulatedElementType {
    return this.getByDataTestId('legacy-evm-active-account');
  }

  get responseText(): EncapsulatedElementType {
    return this.getByDataTestId('legacy-evm-response-text');
  }

  get personalSignButton(): EncapsulatedElementType {
    return this.getByDataTestId('legacy-evm-btn-personal-sign');
  }

  get signTypedDataV4Button(): EncapsulatedElementType {
    return this.getByDataTestId('legacy-evm-btn-sign-typed-data-v4');
  }

  get sendTransactionButton(): EncapsulatedElementType {
    return this.getByDataTestId('legacy-evm-btn-send-transaction');
  }

  get switchToMainnetButton(): EncapsulatedElementType {
    return this.getByDataTestId('legacy-evm-btn-switch-mainnet');
  }

  get switchToPolygonButton(): EncapsulatedElementType {
    return this.getByDataTestId('legacy-evm-btn-switch-polygon');
  }

  get switchToGoerliButton(): EncapsulatedElementType {
    return this.getByDataTestId('legacy-evm-btn-switch-goerli');
  }

  get getBalanceButton(): EncapsulatedElementType {
    return this.getByDataTestId('legacy-evm-btn-get-balance');
  }

  get blockNumberButton(): EncapsulatedElementType {
    return this.getByDataTestId('legacy-evm-btn-block-number');
  }

  get gasPriceButton(): EncapsulatedElementType {
    return this.getByDataTestId('legacy-evm-btn-gas-price');
  }

  // Wagmi selectors
  get connectWagmiButton(): EncapsulatedElementType {
    return this.getByDataTestId('app-btn-connect-wagmi');
  }

  get wagmiDisconnectButton(): EncapsulatedElementType {
    return this.getByDataTestId('wagmi-btn-disconnect');
  }

  get wagmiCard(): EncapsulatedElementType {
    return this.getByDataTestId('wagmi-card');
  }

  get wagmiChainIdValue(): EncapsulatedElementType {
    return this.getByDataTestId('wagmi-chain-id-value');
  }

  get wagmiAccountValue(): EncapsulatedElementType {
    return this.getByDataTestId('wagmi-account-value');
  }

  get wagmiActiveAccount(): EncapsulatedElementType {
    return this.getByDataTestId('wagmi-active-account');
  }

  get wagmiBalanceValue(): EncapsulatedElementType {
    return this.getByDataTestId('wagmi-balance-value');
  }

  get wagmiSignMessageInput(): EncapsulatedElementType {
    return this.getByDataTestId('wagmi-input-message');
  }

  get wagmiSignMessageButton(): EncapsulatedElementType {
    return this.getByDataTestId('wagmi-btn-sign-message');
  }

  get wagmiSignatureResult(): EncapsulatedElementType {
    return this.getByDataTestId('wagmi-signature-result');
  }

  get wagmiSendTxToAddressInput(): EncapsulatedElementType {
    return this.getByDataTestId('wagmi-input-to-address');
  }

  get wagmiSendTxAmountInput(): EncapsulatedElementType {
    return this.getByDataTestId('wagmi-input-amount');
  }

  get wagmiSendTransactionButton(): EncapsulatedElementType {
    return this.getByDataTestId('wagmi-btn-send-transaction');
  }

  get wagmiTxHashResult(): EncapsulatedElementType {
    return this.getByDataTestId('wagmi-tx-hash-result');
  }

  getWagmiSwitchChainButton(chainId: number): EncapsulatedElementType {
    return this.getByDataTestId(`wagmi-btn-switch-chain-${chainId}`);
  }

  // Solana selectors
  get solanaCard(): EncapsulatedElementType {
    return this.getByDataTestId('solana-card');
  }

  get solanaConnectButton(): EncapsulatedElementType {
    return this.getByDataTestId('app-btn-connect-solana');
  }

  get solanaDisconnectButton(): EncapsulatedElementType {
    return this.getByDataTestId('solana-btn-disconnect');
  }

  get solanaAddressContainer(): EncapsulatedElementType {
    return this.getByDataTestId('solana-address-container');
  }

  get solanaSignMessageButton(): EncapsulatedElementType {
    return this.getByDataTestId('solana-btn-sign-message');
  }

  get solanaSignedMessageResult(): EncapsulatedElementType {
    return this.getByDataTestId('solana-signed-message-result');
  }

  getScopeCard(scope: string): EncapsulatedElementType {
    const escapedScope = scope.toLowerCase().replace(/:/g, '-');
    return this.getByDataTestId(`scope-card-${escapedScope}`);
  }

  // Tap actions
  async tapConnectLegacy(): Promise<void> {
    await UnifiedGestures.tap(this.connectLegacyButton);
  }

  async tapDisconnect(): Promise<void> {
    await UnifiedGestures.tap(this.disconnectButton);
  }

  async tapPersonalSign(): Promise<void> {
    await UnifiedGestures.tap(this.personalSignButton);
  }

  async tapSignTypedDataV4(): Promise<void> {
    await UnifiedGestures.tap(this.signTypedDataV4Button);
  }

  async tapSendTransaction(): Promise<void> {
    await UnifiedGestures.tap(this.sendTransactionButton);
  }

  async tapSwitchToMainnet(): Promise<void> {
    await UnifiedGestures.tap(this.switchToMainnetButton);
  }

  async tapSwitchToPolygon(): Promise<void> {
    await UnifiedGestures.tap(this.switchToPolygonButton);
  }

  async tapSwitchToGoerli(): Promise<void> {
    await UnifiedGestures.tap(this.switchToGoerliButton);
  }

  async tapGetBalance(): Promise<void> {
    await UnifiedGestures.tap(this.getBalanceButton);
  }

  async tapConnectWagmi(): Promise<void> {
    await UnifiedGestures.tap(this.connectWagmiButton);
  }

  async tapWagmiDisconnect(): Promise<void> {
    await UnifiedGestures.tap(this.wagmiDisconnectButton);
  }

  async tapWagmiSignMessage(): Promise<void> {
    await UnifiedGestures.tap(this.wagmiSignMessageButton);
  }

  async tapWagmiSendTransaction(): Promise<void> {
    await UnifiedGestures.tap(this.wagmiSendTransactionButton);
  }

  async tapWagmiSwitchChain(chainId: number): Promise<void> {
    await UnifiedGestures.tap(this.getWagmiSwitchChainButton(chainId));
  }

  async typeWagmiSignMessage(message: string): Promise<void> {
    await UnifiedGestures.typeText(this.wagmiSignMessageInput, message);
  }

  async tapSolanaConnect(): Promise<void> {
    await UnifiedGestures.tap(this.solanaConnectButton);
  }

  async tapSolanaDisconnect(): Promise<void> {
    await UnifiedGestures.tap(this.solanaDisconnectButton);
  }

  async tapSolanaSignMessage(): Promise<void> {
    await UnifiedGestures.tap(this.solanaSignMessageButton);
  }

  async tapConnect(): Promise<void> {
    await UnifiedGestures.tap(this.connectButton);
  }

  async waitForConnectButtonVisible(timeoutMs = 15000): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        const element = await asPlaywrightElement(this.connectButton);
        await element.waitForDisplayed({
          timeout: timeoutMs,
          timeoutMsg: 'BrowserPlaygroundDapp: connect button not visible',
        });
      },
    });
  }

  // Assertions
  async assertConnected(isConnected = true): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        if (isConnected) {
          const element = await asPlaywrightElement(this.activeAccount);
          await element.waitForDisplayed({
            timeout: 10000,
            timeoutMsg:
              'BrowserPlaygroundDapp: active account not visible (expected connected)',
          });
        } else {
          const element = await asPlaywrightElement(this.connectLegacyButton);
          await element.waitForDisplayed({
            timeout: 10000,
            timeoutMsg:
              'BrowserPlaygroundDapp: connect legacy button not visible (expected disconnected)',
          });
        }
      },
    });
  }

  async assertChainIdValue(expectedChainId: string): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        const element = await asPlaywrightElement(this.chainIdValue);
        const text = await element.textContent();
        expect(text).toContain(expectedChainId);
      },
    });
  }

  async assertResponseValue(expectedValue: string): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        const element = await asPlaywrightElement(this.responseText);
        const text = await element.textContent();
        expect(text).toContain(expectedValue);
      },
    });
  }

  async assertActiveAccount(expectedAccount: string): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        const element = await asPlaywrightElement(this.activeAccount);
        const text = await element.textContent();
        expect(text?.toLowerCase()).toContain(expectedAccount.toLowerCase());
      },
    });
  }

  async assertAccountsCount(expectedCount: number): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        const element = await asPlaywrightElement(this.accountsValue);
        const text = await element.textContent();
        expect(text).toContain(`${expectedCount} available`);
      },
    });
  }

  async isConnected(): Promise<boolean> {
    try {
      const element = await asPlaywrightElement(this.activeAccount);
      await element.waitForDisplayed({
        timeout: 5000,
        timeoutMsg:
          'BrowserPlaygroundDapp: active account not visible (isConnected check)',
      });
      return true;
    } catch {
      return false;
    }
  }

  async assertWagmiConnected(isConnected = true): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        if (isConnected) {
          const element = await asPlaywrightElement(this.wagmiActiveAccount);
          await element.waitForDisplayed({
            timeout: 10000,
            timeoutMsg:
              'BrowserPlaygroundDapp: wagmi active account not visible (expected connected)',
          });
        } else {
          const element = await asPlaywrightElement(this.connectWagmiButton);
          await element.waitForDisplayed({
            timeout: 10000,
            timeoutMsg:
              'BrowserPlaygroundDapp: wagmi connect button not visible (expected disconnected)',
          });
        }
      },
    });
  }

  async assertWagmiChainIdValue(
    expectedChainId: string | number,
  ): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        const element = await asPlaywrightElement(this.wagmiChainIdValue);
        const text = await element.textContent();
        expect(text).toContain(String(expectedChainId));
      },
    });
  }

  async assertWagmiActiveAccount(expectedAccount: string): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        const element = await asPlaywrightElement(this.wagmiActiveAccount);
        const text = await element.textContent();
        expect(text?.toLowerCase()).toContain(expectedAccount.toLowerCase());
      },
    });
  }

  async assertWagmiSignatureResult(expectedValue: string): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        const element = await asPlaywrightElement(this.wagmiSignatureResult);
        const text = await element.textContent();
        expect(text).toContain(expectedValue);
      },
    });
  }

  async isWagmiConnected(): Promise<boolean> {
    try {
      const element = await asPlaywrightElement(this.wagmiActiveAccount);
      await element.waitForDisplayed({
        timeout: 5000,
        timeoutMsg:
          'BrowserPlaygroundDapp: wagmi active account not visible (isWagmiConnected check)',
      });
      return true;
    } catch {
      return false;
    }
  }

  async assertSolanaConnected(isConnected = true): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        if (isConnected) {
          const element = await asPlaywrightElement(this.solanaCard);
          await element.waitForDisplayed({
            timeout: 10000,
            timeoutMsg:
              'BrowserPlaygroundDapp: solana card not visible (expected connected)',
          });
        } else {
          const element = await asPlaywrightElement(this.solanaConnectButton);
          await element.waitForDisplayed({
            timeout: 10000,
            timeoutMsg:
              'BrowserPlaygroundDapp: solana connect button not visible (expected disconnected)',
          });
        }
      },
    });
  }

  async assertSolanaActiveAccount(expectedAddress: string): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        const element = await asPlaywrightElement(this.solanaAddressContainer);
        const text = await element.textContent();
        expect(text?.toLowerCase()).toContain(expectedAddress.toLowerCase());
      },
    });
  }

  async assertSolanaSignedMessageResult(expectedValue: string): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        const element = await asPlaywrightElement(
          this.solanaSignedMessageResult,
        );
        await element.waitForDisplayed({
          timeout: 10000,
          timeoutMsg:
            'BrowserPlaygroundDapp: solana signed message result not visible',
        });
        const text = await element.textContent();
        expect(text).toContain(expectedValue);
      },
    });
  }

  async assertMultichainConnected(isConnected = true): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        if (isConnected) {
          const element = await asPlaywrightElement(
            this.connectedScopesSection,
          );
          await element.waitForDisplayed({
            timeout: 10000,
            timeoutMsg:
              'BrowserPlaygroundDapp: scopes section not visible (expected multichain connected)',
          });
        } else {
          const element = await asPlaywrightElement(this.connectButton);
          await element.waitForDisplayed({
            timeout: 10000,
            timeoutMsg:
              'BrowserPlaygroundDapp: connect button not visible (expected multichain disconnected)',
          });
        }
      },
    });
  }

  async assertScopeCardVisible(scope: string): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        const element = await asPlaywrightElement(this.getScopeCard(scope));
        await element.waitForDisplayed({
          timeout: 10000,
          timeoutMsg: `BrowserPlaygroundDapp: scope card "${scope}" not visible`,
        });
      },
    });
  }

  async assertScopeCardNotVisible(scope: string): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        const element = await asPlaywrightElement(this.getScopeCard(scope));
        const visible = await element.isVisible();
        if (visible) {
          throw new Error(
            `BrowserPlaygroundDapp: scope card "${scope}" is still visible (expected not displayed)`,
          );
        }
      },
    });
  }
}

export default new BrowserPlaygroundDapp();
