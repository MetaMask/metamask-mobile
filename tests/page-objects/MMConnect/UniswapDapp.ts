import {
  asPlaywrightElement,
  encapsulated,
  encapsulatedAction,
  EncapsulatedElementType,
  PlatformDetector,
  PlaywrightAssertions,
  PlaywrightGestures,
  PlaywrightMatchers,
  sleep,
  UnifiedGestures,
} from '../../framework';

class UniswapDapp {
  private getByXPath(xpath: string): EncapsulatedElementType {
    return encapsulated({
      appium: () => PlaywrightMatchers.getLazyElementByXPath(xpath),
    });
  }

  get connectButton(): EncapsulatedElementType {
    return encapsulated({
      appium: {
        android: () =>
          PlaywrightMatchers.getLazyElementByXPath(
            '//*[@data-testid="navbar-connect-wallet"]',
          ),
        ios: () =>
          PlaywrightMatchers.getElementById('Connect', { exact: true }),
      },
    });
  }

  get walletConnect(): EncapsulatedElementType {
    return encapsulated({
      appium: {
        android: () =>
          PlaywrightMatchers.getElementByXPath(
            '//*[contains(normalize-space(.), "WalletConnect")]',
          ),
        ios: () =>
          PlaywrightMatchers.getElementByXPath(
            '//XCUIElementTypeStaticText[@name="WalletConnect"]',
          ),
      },
    });
  }

  get metaMaskWalletOption(): EncapsulatedElementType {
    return encapsulated({
      appium: {
        android: () =>
          PlaywrightMatchers.getLazyElementByXPath(
            '//android.widget.Button[@text="MetaMask MetaMask"]',
          ),
        ios: () =>
          PlaywrightMatchers.getElementByAccessibilityId('MetaMaskMetaMask'),
      },
    });
  }

  get metaMaskDeeplinkButton(): EncapsulatedElementType {
    return encapsulated({
      appium: {
        android: () =>
          PlaywrightMatchers.getLazyElementByXPath(
            '//android.widget.TextView[@text="MetaMask"]',
          ),
        ios: () =>
          PlaywrightMatchers.getLazyElementByXPath(
            '//XCUIElementTypeOther[@name="textfield"]',
          ),
      },
    });
  }

  get uniswapDialog(): EncapsulatedElementType {
    return this.getByXPath('//android.app.AlertDialog');
  }

  get uniswapIcon(): EncapsulatedElementType {
    return encapsulated({
      appium: () => PlaywrightMatchers.getElementById('account-icon'),
    });
  }

  get solanaPopup(): EncapsulatedElementType {
    return encapsulated({
      appium: () =>
        PlaywrightMatchers.getElementByText('Use Solana on Uniswap'),
    });
  }

  get SolanaPopup(): EncapsulatedElementType {
    return this.solanaPopup;
  }

  async waitForConnectButtonVisible(timeoutMs = 20000): Promise<void> {
    await this.waitForElementVisible(
      this.connectButton,
      timeoutMs,
      'UniswapDapp: connect button not visible',
    );
  }

  async waitForWalletConnectVisible(timeoutMs = 15000): Promise<void> {
    await this.waitForElementVisible(
      this.walletConnect,
      timeoutMs,
      'UniswapDapp: WalletConnect option not visible',
    );
  }

  async tapConnect(): Promise<void> {
    await PlaywrightGestures.waitAndTap(
      await asPlaywrightElement(this.connectButton),
      {
        delay: 3000, // 3 seconds - DOM might not be ready yet
      },
    );
  }

  async tapOnWalletConnect(): Promise<void> {
    await PlaywrightGestures.waitAndTap(
      await asPlaywrightElement(this.walletConnect),
      {
        delay: 3000, // 3 seconds - DOM might not be ready yet
      },
    );
  }

  async connectWithMetaMask(): Promise<void> {
    await this.waitForConnectButtonVisible();
    await this.tapConnect();
    await this.waitForWalletConnectVisible();
    await this.tapOnWalletConnect();
  }

  async connectIOS(timeoutMs = 20000): Promise<void> {
    await this.waitForConnectButtonVisible(timeoutMs);
    await this.tapConnect();
  }

  async selectWalletConnectOption(): Promise<void> {
    await this.tapOnWalletConnect();
  }

  async tapOnMetaMaskWalletOption(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.metaMaskWalletOption, {
      description: 'tap MetaMask wallet option',
    });
  }

  async tapOnMetaMaskDeeplinkButton(): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        await sleep(2000);
        await PlaywrightGestures.waitAndTap(
          await asPlaywrightElement(this.metaMaskDeeplinkButton),
        );
      },
    });
  }

  async tapOnMetaMaskWalletOptionAndOpenDeeplink(): Promise<void> {
    await this.tapOnMetaMaskWalletOption();
    if (PlatformDetector.isAndroid()) {
      await this.tapOnMetaMaskDeeplinkButton();
    }
  }

  async isUniswapDisplayed(timeoutMs = 30000): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        if (PlatformDetector.isAndroid()) {
          const dialogVisible = await this.isElementVisible(
            this.uniswapDialog,
            timeoutMs,
          );

          if (dialogVisible) {
            return;
          }

          const iconVisible = await this.isElementVisible(
            this.uniswapIcon,
            timeoutMs,
          );

          if (!iconVisible) {
            throw new Error(
              'Neither Uniswap dialog nor account icon is visible in Android context',
            );
          }

          return;
        }

        await this.waitForElementVisible(
          this.solanaPopup,
          timeoutMs,
          'UniswapDapp: Solana popup not visible',
        );
      },
    });
  }

  private async waitForElementVisible(
    targetElement: EncapsulatedElementType,
    timeoutMs: number,
    timeoutMsg: string,
  ): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        await PlaywrightAssertions.expectConditionWithRetry(
          async () => {
            const resolvedElement = await asPlaywrightElement(targetElement);
            await resolvedElement.waitForDisplayed({
              timeout: timeoutMs,
              timeoutMsg,
            });
          },
          {
            maxRetries: 5,
            description: timeoutMsg,
          },
        );
      },
    });
  }

  private async isElementVisible(
    targetElement: EncapsulatedElementType,
    timeoutMs: number,
  ): Promise<boolean> {
    try {
      const resolvedElement = await asPlaywrightElement(targetElement);
      await resolvedElement.waitForDisplayed({ timeout: timeoutMs });
      return true;
    } catch {
      return false;
    }
  }
}

export default new UniswapDapp();
