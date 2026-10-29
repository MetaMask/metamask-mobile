import { WalletViewSelectorsIDs } from '../../../app/components/Views/Wallet/WalletView.testIds';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import Assertions from '../../framework/Assertions';
import Utilities from '../../framework/Utilities';
import {
  type AppiumElement,
  createLogger,
  getDriver,
  wrapElement,
} from '../../framework';
import { findWithSelfHealingLocator } from '../../framework/ai-locator/SelfHealingLocator.ts';
import {
  getPerformanceLocatorRecovery,
  isPerformanceSuiteActive,
} from '../../framework/ai-locator/PerformanceLocatorRecovery.ts';
import { PlatformDetector } from '../../framework/PlatformLocator';
import { getWindowSize } from '../../framework/DeviceInfoCache.ts';
import { resolveE2EWaitTimeoutMs } from '../../framework/Constants';
import TabBarComponent from './TabBarComponent';
import { pixelsToClearTabBar } from './tabBarClearance';

const WALLET_HOME_SWIPE_PERCENT = 0.5;
const MAX_TAB_BAR_CLEARANCE_SCROLLS = 3;
// The wallet tab button's top sits inside the floating bar, so measuring only
// that edge leaves the header under the bar and the tap hits Money.
const TAB_BAR_TOUCH_SLOP_PX = 96;

const logger = createLogger({ name: 'WalletHomeScroll' });

export class WalletHomeScroll {
  get walletScrollContainer(): string {
    return WalletViewSelectorsIDs.WALLET_SCROLL_VIEW;
  }

  get walletScrollView(): Promise<AppiumElement> {
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
    )) as AppiumElement;
    const location = await container.unwrap().getLocation();
    const size = await container.unwrap().getSize();
    const centerX = Math.floor(location.x + size.width / 2);
    const travel = Math.floor(
      size.height * Math.min(Math.max(percent, 0.1), 0.9),
    );
    const fingerDirection = scrollDirection === 'down' ? 'up' : 'down';

    // Performance starts the drag higher so the floating tab bar does not
    // swallow it. Smoke keeps the previous 0.75 start.
    const fromYRatio = isPerformanceSuiteActive() ? 0.5 : 0.75;
    const fromY =
      fingerDirection === 'up'
        ? location.y + Math.floor(size.height * fromYRatio)
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

  /**
   * Re-query the target by its selector so swipe/scroll loops do not keep
   * polling a stale element id after the original node is unmounted.
   */
  async resolveFreshWalletHomeTarget(
    target: Promise<AppiumElement>,
  ): Promise<AppiumElement> {
    const located = await target;
    const selector = await located.unwrap().selector;
    if (typeof selector !== 'string' || selector.length === 0) {
      return located;
    }

    return wrapElement(getDriver().$(selector));
  }

  async scrollWalletHomeToElement(
    target: Promise<AppiumElement>,
    description: string,
    direction: 'up' | 'down' = 'down',
    maxAttempts = 16,
    options: { fullyVisible?: boolean } = {},
  ): Promise<void> {
    await Assertions.expectElementToBeVisible(this.walletScrollView, {
      timeout: resolveE2EWaitTimeoutMs(10_000),
      description: `wallet-scroll-view for ${description}`,
    });

    if (this.isAndroidAppium()) {
      const scrollView = (await Promise.resolve(
        this.walletScrollView,
      )) as AppiumElement;
      const freshTarget = await this.resolveFreshWalletHomeTarget(target);
      const scrollDirection: 'up' | 'down' =
        direction === 'down' ? 'up' : 'down';
      if (isPerformanceSuiteActive()) {
        // WDIO scrollIntoView swipes from 75% of this ScrollView. The view
        // runs under the floating tab bar, so that gesture is swallowed and
        // the list never moves. It also skips the swipe entirely once Android
        // reports the header as displayed. Drag from mid-screen instead.
        await this.scrollUntilVisible(
          target,
          description,
          direction,
          maxAttempts,
        );
      } else {
        const scrollOptions = {
          scrollableElement: scrollView,
          direction: scrollDirection,
          percent: WALLET_HOME_SWIPE_PERCENT,
          maxScrolls: maxAttempts,
        };
        // scrollIntoView stops on the first visible pixel, which leaves rows
        // clipped under the floating tab bar. Fully-visible is the shared nudge.
        if (options.fullyVisible) {
          await Gestures.scrollIntoViewFullyVisible(freshTarget, scrollOptions);
        } else {
          await Gestures.scrollIntoView(freshTarget, scrollOptions);
        }
      }
      await Assertions.expectElementToBeVisible(
        await this.resolveFreshWalletHomeTarget(target),
        {
          timeout: 5_000,
          description,
        },
      );
      return;
    }

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        await Assertions.expectElementToBeVisible(
          await this.resolveFreshWalletHomeTarget(target),
          {
            timeout: 1_500,
            description,
          },
        );
        return;
      } catch {
        await this.scrollWalletHome(direction, 0.5);
      }
    }

    await Assertions.expectElementToBeVisible(
      await this.resolveFreshWalletHomeTarget(target),
      {
        timeout: 5_000,
        description,
      },
    );
  }

  /**
   * Scrolls the home list until `target` is not covered by the floating tab
   * bar. A header that peeks out from behind the bar counts as displayed, but
   * tapping its center hits the bar (e.g. Money) instead. A swipe can travel
   * less than requested, so the position is measured again after each scroll.
   * Leaves the target untouched when the tab bar is not on screen.
   */
  async scrollUntilVisible(
    target: Promise<AppiumElement>,
    description: string,
    direction: 'up' | 'down',
    maxAttempts: number,
  ): Promise<void> {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        await Assertions.expectElementToBeVisible(
          await this.resolveFreshWalletHomeTarget(target),
          {
            timeout: 1_500,
            description,
          },
        );
        return;
      } catch {
        logger.info(
          `Scrolling wallet home ${direction} to reveal "${description}" (${attempt + 1}/${maxAttempts})`,
        );
        await this.scrollWalletHome(direction, 0.45);
      }
    }
  }

  async scrollClearOfTabBar(
    target: Promise<AppiumElement>,
    description: string,
  ): Promise<AppiumElement> {
    const windowHeight = getWindowSize().height;
    let tabBarTop = Math.floor(windowHeight * 0.82);
    const tabBarButton = TabBarComponent.tabBarWalletButton;
    if (await Utilities.isElementVisible(tabBarButton, 1_000)) {
      tabBarTop = (await (await tabBarButton).unwrap().getLocation()).y;
    } else {
      logger.info(
        `Wallet tab button not found; clearing "${description}" against y=${tabBarTop}`,
      );
    }

    let current = await this.resolveFreshWalletHomeTarget(target);
    for (let scroll = 1; scroll <= MAX_TAB_BAR_CLEARANCE_SCROLLS; scroll += 1) {
      const [location, size, scrollView] = await Promise.all([
        current.unwrap().getLocation(),
        current.unwrap().getSize(),
        Promise.resolve(this.walletScrollView),
      ]);
      const needed = pixelsToClearTabBar(
        { y: location.y, height: size.height },
        tabBarTop - TAB_BAR_TOUCH_SLOP_PX,
      );
      if (needed === 0) {
        logger.info(
          `"${description}" is clear of the tab bar (bottom=${location.y + size.height}, barTop=${tabBarTop})`,
        );
        return current;
      }

      const viewHeight = (await scrollView.unwrap().getSize()).height;
      logger.info(
        `Scrolling ${needed}px so "${description}" clears the floating tab bar (${scroll}/${MAX_TAB_BAR_CLEARANCE_SCROLLS})`,
      );
      await this.scrollWalletHome('down', Math.max(needed / viewHeight, 0.22));
      current = await this.resolveFreshWalletHomeTarget(target);
    }

    return current;
  }

  async tapIfAlreadyVisible(
    target: Promise<AppiumElement>,
    description: string,
    options: {
      tapTimeout?: number;
      /**
       * Applied only after a tap on an already-displayed target fails.
       * Android reports a header behind the floating tab bar as displayed,
       * so the first tap misses and this nudge clears it.
       */
      overshootSwipe?: { direction: 'up' | 'down'; percentage?: number };
      /** Scroll clear of the floating tab bar before the first tap. */
      clearTabBar?: boolean;
    } = {},
  ): Promise<boolean> {
    const {
      tapTimeout = 30_000,
      overshootSwipe,
      clearTabBar = false,
    } = options;

    try {
      let freshTarget = await this.resolveFreshWalletHomeTarget(target);
      await Assertions.expectElementToBeVisible(freshTarget, {
        timeout: 2000,
        description,
      });
      if (clearTabBar) {
        freshTarget = await this.scrollClearOfTabBar(
          Promise.resolve(freshTarget),
          description,
        );
      }
      try {
        await Gestures.waitAndTap(freshTarget, {
          elemDescription: description,
          timeout: tapTimeout,
        });
        return true;
      } catch {
        if (!overshootSwipe) {
          return false;
        }
        await this.applySectionOvershoot(overshootSwipe, description);
        const nudgedTarget = await this.resolveFreshWalletHomeTarget(target);
        await Gestures.waitAndTap(nudgedTarget, {
          elemDescription: description,
          timeout: tapTimeout,
        });
        return true;
      }
    } catch {
      return false;
    }
  }

  /**
   * One short swipe after a section is already in the viewport.
   * `scrollIntoView` stops on the first visible pixel, which often leaves
   * the header under the tab bar.
   */
  async applySectionOvershoot(
    overshootSwipe: { direction: 'up' | 'down'; percentage?: number },
    description: string,
  ): Promise<void> {
    const overshootScrollDirection =
      overshootSwipe.direction === 'up' ? 'down' : 'up';
    if (this.isAndroidAppium()) {
      await this.scrollWalletHomeAndroid(
        overshootScrollDirection,
        overshootSwipe.percentage ?? 0.15,
      );
      return;
    }

    await Gestures.swipe(this.walletScrollView, overshootSwipe.direction, {
      percentage: overshootSwipe.percentage ?? 0.15,
      speed: 'slow',
      elemDescription: `Overshoot swipe for ${description}`,
    });
  }

  async scrollAndTapSection(
    target: Promise<AppiumElement>,
    description: string,
    direction: 'up' | 'down' = 'down',
    options: {
      scrollAmount?: number;
      overshootSwipe?: { direction: 'up' | 'down'; percentage?: number };
      /**
       * Not a wall-clock cap. Values at or below 16s still resolve to 8
       * `scrollIntoView` attempts; larger values only add attempts.
       * Pass `maxAttempts` when the attempt count itself must change.
       */
      timeout?: number;
      /** Overrides the attempt count derived from `timeout`, including below 8. */
      maxAttempts?: number;
      tapTimeout?: number;
      /** Scroll clear of the floating tab bar before tapping. */
      clearTabBar?: boolean;
      /** Use scrollIntoViewFullyVisible so the row clears the tab bar. */
      fullyVisible?: boolean;
    } = {},
  ): Promise<void> {
    const {
      overshootSwipe,
      timeout = 15_000,
      maxAttempts: maxAttemptsOverride,
      tapTimeout = 30_000,
      clearTabBar = false,
      fullyVisible = false,
    } = options;
    const maxAttempts =
      maxAttemptsOverride ?? Math.max(8, Math.ceil(timeout / 2_000));
    const recovery = getPerformanceLocatorRecovery();

    const scrollIntoViewWithOvershoot = async (
      sectionTarget: Promise<AppiumElement>,
      scrollDirection: 'up' | 'down',
    ): Promise<AppiumElement> => {
      await this.scrollWalletHomeToElement(
        sectionTarget,
        description,
        scrollDirection,
        maxAttempts,
        { fullyVisible },
      );
      // Android fully-visible already nudges clear of the tab bar.
      // iOS ignores fullyVisible, so it still needs the overshoot swipe.
      if (overshootSwipe && !(fullyVisible && this.isAndroidAppium())) {
        await this.applySectionOvershoot(overshootSwipe, description);
      }
      return this.resolveFreshWalletHomeTarget(sectionTarget);
    };

    const { element } = await findWithSelfHealingLocator({
      intent: `scroll wallet home to and tap ${description}`,
      primary: async () => scrollIntoViewWithOvershoot(target, direction),
      driver: getDriver(),
      recovery: recovery?.provider,
      // Recovered locators may sit above or below the failed primary path —
      // try both scroll directions before giving up.
      recoverAction: async (recoveredElement) => {
        const recoveredTarget = Promise.resolve(recoveredElement);
        let ready: AppiumElement | undefined;
        await this.tryScrollDirections(async (scrollDirection) => {
          ready = await scrollIntoViewWithOvershoot(
            recoveredTarget,
            scrollDirection,
          );
        });
        if (!ready) {
          throw new Error(
            `Failed to scroll recovered locator into view for ${description}`,
          );
        }
        return ready;
      },
      onRecovered: recovery?.onRecovered,
    });

    const tapTarget = clearTabBar
      ? await this.scrollClearOfTabBar(Promise.resolve(element), description)
      : element;

    await Gestures.waitAndTap(tapTarget, {
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
