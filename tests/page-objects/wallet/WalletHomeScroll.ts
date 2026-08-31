import { WalletViewSelectorsIDs } from '../../../app/components/Views/Wallet/WalletView.testIds';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import Assertions from '../../framework/Assertions';
import {
  EncapsulatedElementType,
  getDriver,
  type PlaywrightElement,
} from '../../framework';
import { PlatformDetector } from '../../framework/PlatformLocator';
import { resolveE2EWaitTimeoutMs } from '../../framework/Constants';

export class WalletHomeScroll {
  get walletScrollContainer(): string {
    return WalletViewSelectorsIDs.WALLET_SCROLL_VIEW;
  }

  get walletScrollView(): EncapsulatedElementType {
    return Matchers.getElementByID(WalletViewSelectorsIDs.WALLET_SCROLL_VIEW);
  }

  isAndroidAppium(): boolean {
    return PlatformDetector.isAndroid();
  }

  mapWalletHomeScrollToSwipe(scrollDirection: 'up' | 'down'): 'up' | 'down' {
    return scrollDirection === 'down' ? 'up' : 'down';
  }

  async scrollWalletHome(
    scrollDirection: 'up' | 'down',
    percent = 0.45,
  ): Promise<void> {
    if (this.isAndroidAppium()) {
      await this.scrollWalletHomeAndroid(scrollDirection, percent);
      return;
    }

    const swipeDirection = this.mapWalletHomeScrollToSwipe(scrollDirection);
    await Gestures.swipe(this.walletScrollView, swipeDirection, {
      percentage: percent,
      elemDescription: `Scroll wallet homepage ${scrollDirection}`,
    });
  }

  async scrollWalletHomeAndroid(
    scrollDirection: 'up' | 'down',
    percent = 0.45,
  ): Promise<void> {
    const container = (await Promise.resolve(
      this.walletScrollView,
    )) as PlaywrightElement;
    const location = await container.unwrap().getLocation();
    const size = await container.unwrap().getSize();
    const centerX = Math.floor(location.x + size.width / 2);
    const travel = Math.floor(
      size.height * Math.min(Math.max(percent, 0.1), 0.9),
    );
    const fingerDirection = scrollDirection === 'down' ? 'up' : 'down';

    const fromY =
      fingerDirection === 'up'
        ? location.y + Math.floor(size.height * 0.75)
        : location.y + Math.floor(size.height * 0.35);
    const toY = fingerDirection === 'up' ? fromY - travel : fromY + travel;

    const drv = getDriver();
    await drv.swipe({
      direction: fingerDirection,
      percent,
      duration: 600,
      from: { x: centerX, y: fromY },
      to: { x: centerX, y: toY },
    });
  }

  async scrollWalletHomeToElement(
    target: EncapsulatedElementType,
    description: string,
    direction: 'up' | 'down' = 'down',
    maxAttempts = 16,
  ): Promise<void> {
    if (this.isAndroidAppium()) {
      await Assertions.expectElementToBeVisible(this.walletScrollView, {
        timeout: resolveE2EWaitTimeoutMs(10_000),
        description: `wallet-scroll-view for ${description}`,
      });
      const scrollView = (await Promise.resolve(
        this.walletScrollView,
      )) as PlaywrightElement;
      await Gestures.scrollIntoView(target, {
        scrollableElement: scrollView,
        direction: direction === 'down' ? 'up' : 'down',
        maxScrolls: maxAttempts,
      });
      await Assertions.expectElementToBeVisible(target, {
        timeout: 5_000,
        description,
      });
      return;
    }

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        await Assertions.expectElementToBeVisible(target, {
          timeout: 1_500,
          description,
        });
        return;
      } catch {
        await this.scrollWalletHome(direction, 0.5);
      }
    }

    await Assertions.expectElementToBeVisible(target, {
      timeout: 5_000,
      description,
    });
  }

  async tapIfAlreadyVisible(
    target: EncapsulatedElementType,
    description: string,
    options: { tapTimeout?: number } = {},
  ): Promise<boolean> {
    const { tapTimeout = 30_000 } = options;

    try {
      await Assertions.expectElementToBeVisible(target, {
        timeout: 2000,
        description,
      });
      await Gestures.waitAndTap(target, {
        elemDescription: description,
        timeout: tapTimeout,
      });
      return true;
    } catch {
      return false;
    }
  }

  async scrollAndTapSection(
    target: EncapsulatedElementType,
    description: string,
    direction: 'up' | 'down' = 'down',
    options: {
      scrollAmount?: number;
      overshootSwipe?: { direction: 'up' | 'down'; percentage?: number };
      timeout?: number;
      tapTimeout?: number;
    } = {},
  ): Promise<void> {
    const { overshootSwipe, timeout = 15_000, tapTimeout = 30_000 } = options;

    await this.scrollWalletHomeToElement(
      target,
      description,
      direction,
      Math.max(8, Math.ceil(timeout / 2_000)),
    );
    if (overshootSwipe) {
      const overshootScrollDirection =
        overshootSwipe.direction === 'up' ? 'down' : 'up';
      if (this.isAndroidAppium()) {
        await this.scrollWalletHomeAndroid(
          overshootScrollDirection,
          overshootSwipe.percentage ?? 0.15,
        );
      } else {
        await Gestures.swipe(this.walletScrollView, overshootSwipe.direction, {
          percentage: overshootSwipe.percentage ?? 0.15,
          speed: 'slow',
          elemDescription: `Overshoot swipe for ${description}`,
        });
      }
    }
    await Gestures.waitAndTap(target, {
      elemDescription: description,
      timeout: tapTimeout,
    });
  }

  async tryScrollDirections(
    action: (direction: 'up' | 'down') => Promise<void>,
    directions: readonly ('up' | 'down')[] = ['down', 'up'],
  ): Promise<void> {
    let lastError: unknown;
    for (const direction of directions) {
      try {
        await action(direction);
        return;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  }
}

export default new WalletHomeScroll();
