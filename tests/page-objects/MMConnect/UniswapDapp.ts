import Assertions from '../../framework/Assertions';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import { PlatformDetector, sleep, type AppiumElement } from '../../framework';

class UniswapDapp {
  private getByXPath(xpath: string): Promise<AppiumElement> {
    return Matchers.getLazyElementByNativeXPath(xpath);
  }

  get connectButton(): Promise<AppiumElement> {
    if (PlatformDetector.isAndroid()) {
      return Matchers.getLazyElementByNativeXPath(
        '//*[@data-testid="navbar-connect-wallet"]',
      );
    }
    return Matchers.getElementByID('Connect');
  }

  get walletConnect(): Promise<AppiumElement> {
    if (PlatformDetector.isAndroid()) {
      return Matchers.getElementByNativeXPath(
        '//*[contains(normalize-space(.), "WalletConnect")]',
      );
    }
    return Matchers.getElementByNativeXPath(
      '//XCUIElementTypeStaticText[@name="WalletConnect"]',
    );
  }

  get metaMaskWalletOption(): Promise<AppiumElement> {
    if (PlatformDetector.isAndroid()) {
      return Matchers.getLazyElementByNativeXPath(
        '//android.widget.Button[@text="MetaMask MetaMask"]',
      );
    }
    return Matchers.getElementByID('MetaMaskMetaMask');
  }

  get metaMaskDeeplinkButton(): Promise<AppiumElement> {
    if (PlatformDetector.isAndroid()) {
      return Matchers.getLazyElementByNativeXPath(
        '//android.widget.TextView[@text="MetaMask"]',
      );
    }
    return Matchers.getLazyElementByNativeXPath(
      '//XCUIElementTypeOther[@name="textfield"]',
    );
  }

  get uniswapDialog(): Promise<AppiumElement> {
    return this.getByXPath('//android.app.AlertDialog');
  }

  get uniswapIcon(): Promise<AppiumElement> {
    return Matchers.getElementByID('account-icon');
  }

  get solanaPopup(): Promise<AppiumElement> {
    return Matchers.getElementByText('Use Solana on Uniswap');
  }

  get SolanaPopup(): Promise<AppiumElement> {
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
    await Gestures.waitAndTap(this.connectButton, {
      delay: 3000, // DOM might not be ready yet
      elemDescription: 'Uniswap connect button',
    });
  }

  async tapOnWalletConnect(): Promise<void> {
    await Gestures.waitAndTap(this.walletConnect, {
      delay: 3000, // DOM might not be ready yet
      elemDescription: 'Uniswap WalletConnect option',
    });
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
    await Gestures.waitAndTap(this.metaMaskWalletOption, {
      elemDescription: 'tap MetaMask wallet option',
    });
  }

  async tapOnMetaMaskDeeplinkButton(): Promise<void> {
    await sleep(2000);
    await Gestures.waitAndTap(this.metaMaskDeeplinkButton, {
      elemDescription: 'MetaMask deeplink button',
    });
  }

  async tapOnMetaMaskWalletOptionAndOpenDeeplink(): Promise<void> {
    await this.tapOnMetaMaskWalletOption();
    if (PlatformDetector.isAndroid()) {
      await this.tapOnMetaMaskDeeplinkButton();
    }
  }

  async isUniswapDisplayed(timeoutMs = 30000): Promise<void> {
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
  }

  private async waitForElementVisible(
    targetElement: Promise<AppiumElement>,
    timeoutMs: number,
    timeoutMsg: string,
  ): Promise<void> {
    await Assertions.expectElementToBeVisible(targetElement, {
      timeout: timeoutMs,
      description: timeoutMsg,
    });
  }

  private async isElementVisible(
    targetElement: Promise<AppiumElement>,
    timeoutMs: number,
  ): Promise<boolean> {
    try {
      await Assertions.expectElementToBeVisible(targetElement, {
        timeout: timeoutMs,
      });
      return true;
    } catch {
      return false;
    }
  }
}

export default new UniswapDapp();
