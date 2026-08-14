import {
  WalletViewSelectorsIDs,
  WalletViewSelectorsText,
} from '../../../app/components/Views/Wallet/WalletView.testIds';
import {
  PredictPositionsHeaderSelectorsIDs,
  PredictClaimConfirmationSelectorsIDs,
  PredictMarketDetailsSelectorsIDs,
} from '../../../app/components/UI/Predict/Predict.testIds';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import Assertions from '../../framework/Assertions';
import Utilities from '../../framework/Utilities';
import { EncapsulatedElementType } from '../../framework/EncapsulatedElement';
import { resolveE2EWaitTimeoutMs } from '../../framework/Constants';
import WalletHomeScroll from './WalletHomeScroll';

export class WalletHomeSections {
  get defiTab(): EncapsulatedElementType {
    return Matchers.getElementByText(WalletViewSelectorsText.DEFI_TAB);
  }

  get defiNetworkFilter(): EncapsulatedElementType {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.DEFI_POSITIONS_NETWORK_FILTER,
    );
  }

  get defiTabContainer(): EncapsulatedElementType {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.DEFI_POSITIONS_CONTAINER,
    );
  }

  get claimButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      PredictPositionsHeaderSelectorsIDs.CLAIM_BUTTON,
    );
  }

  get predictClaimConfirmButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      PredictClaimConfirmationSelectorsIDs.CLAIM_CONFIRM_BUTTON,
    );
  }

  get availableBalanceLabel(): EncapsulatedElementType {
    return Matchers.getElementByText(WalletViewSelectorsText.AVAILABLE_BALANCE);
  }

  get defiPositionsNew(): EncapsulatedElementType {
    return Matchers.getElementByText(WalletViewSelectorsText.DEFI_SECTION);
  }

  get perpsSectionHeader(): EncapsulatedElementType {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.HOMEPAGE_SECTION_TITLE('perps'),
    );
  }

  get predictionsSectionHeader(): EncapsulatedElementType {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.HOMEPAGE_SECTION_TITLE('predictions'),
    );
  }

  get getMoneySection(): EncapsulatedElementType {
    // Partial ID match for package-qualified Android resource IDs.
    return Matchers.getElementByID(/homepage-section-title-cash/);
  }

  get tokensSectionHeader(): EncapsulatedElementType {
    return Matchers.getElementByText(WalletViewSelectorsText.TOKENS_SECTION);
  }

  get tokensSection(): EncapsulatedElementType {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.HOMEPAGE_SECTION_TITLE('tokens'),
    );
  }

  get nftsSectionHeader(): EncapsulatedElementType {
    return Matchers.getElementByText(WalletViewSelectorsText.NFTS_SECTION);
  }

  async tapOnNewTokensSection(): Promise<void> {
    await this.scrollAndTapTokensSection();
  }

  async scrollAndTapTokensSection(
    direction: 'up' | 'down' = 'down',
  ): Promise<void> {
    if (
      await WalletHomeScroll.tapIfAlreadyVisible(
        this.tokensSectionHeader,
        'Tokens section',
      )
    ) {
      return;
    }

    const getScrollOptions = (scrollDirection: 'up' | 'down') => ({
      overshootSwipe: {
        direction:
          scrollDirection === 'down' ? ('up' as const) : ('down' as const),
        percentage: 0.15,
      },
      timeout: 60_000,
    });

    try {
      await WalletHomeScroll.scrollAndTapSection(
        this.tokensSectionHeader,
        'Tokens section',
        direction,
        getScrollOptions(direction),
      );
    } catch {
      const fallbackDirection = direction === 'down' ? 'up' : 'down';
      await WalletHomeScroll.scrollAndTapSection(
        this.tokensSectionHeader,
        'Tokens section',
        fallbackDirection,
        getScrollOptions(fallbackDirection),
      );
    }
  }

  async tapOnTokensSection(): Promise<void> {
    await Utilities.waitForElementToStopMoving(this.tokensSection);
    await Gestures.waitAndTap(this.tokensSection, {
      elemDescription: 'Tokens Section',
    });
  }

  async tapOnDeFiTab(): Promise<void> {
    await Gestures.waitAndTap(this.defiTab, {
      elemDescription: 'DeFi Tab',
    });
  }

  async tapOnDeFiNetworksFilter(): Promise<void> {
    await Gestures.waitAndTap(this.defiNetworkFilter, {
      elemDescription: 'DeFi Networks Filter',
    });
  }

  async scrollAndTapDefiSection(): Promise<void> {
    await WalletHomeScroll.scrollAndTapSection(
      this.defiPositionsNew,
      'DeFi section',
    );
  }

  async scrollAndTapPerpsSection(): Promise<void> {
    try {
      await WalletHomeScroll.scrollAndTapSection(
        this.perpsSectionHeader,
        'Perpetuals section',
      );
    } catch {
      await WalletHomeScroll.scrollAndTapSection(
        this.perpsSectionHeader,
        'Perpetuals section',
        'up',
      );
    }
  }

  async scrollAndTapPredictionsSection(
    direction: 'up' | 'down' = 'down',
    options: {
      overshootSwipe?: { direction: 'up' | 'down'; percentage?: number };
    } = {},
  ): Promise<void> {
    if (
      await WalletHomeScroll.tapIfAlreadyVisible(
        this.predictionsSectionHeader,
        'Predictions section',
      )
    ) {
      return;
    }

    const fallbackDirection = direction === 'down' ? 'up' : 'down';

    await WalletHomeScroll.tryScrollDirections(
      (scrollDirection) =>
        WalletHomeScroll.scrollAndTapSection(
          this.predictionsSectionHeader,
          'Predictions section',
          scrollDirection,
          {
            overshootSwipe: options.overshootSwipe ?? {
              direction:
                scrollDirection === 'down'
                  ? ('up' as const)
                  : ('down' as const),
              percentage: 0.15,
            },
            timeout: 60_000,
          },
        ),
      [direction, fallbackDirection],
    );
  }

  async scrollPredictionsSectionIntoView(
    direction: 'up' | 'down' = 'down',
    options: { maxAttempts?: number } = {},
  ): Promise<void> {
    const { maxAttempts = 24 } = options;

    await WalletHomeScroll.scrollWalletHomeToElement(
      this.predictionsSectionHeader,
      'Predictions section',
      direction,
      maxAttempts,
    );
  }

  async scrollAndTapPredictionsPosition(
    positionName: string,
    positionId?: string,
  ): Promise<void> {
    const target = positionId
      ? Matchers.getElementByID(`predict-position-row-${positionId}`)
      : Matchers.getElementByText(positionName);

    const description = `Predictions Position: ${positionName}`;
    const marketDetailsScreen = Matchers.getElementByID(
      PredictMarketDetailsSelectorsIDs.SCREEN,
    );
    const scrollAndTapRetryTimeoutMs = 90_000;
    const intoViewMaxAttempts = 8;
    const scrollAndTapPerDirectionMs = 15_000;
    const tapTimeoutMs = 10_000;
    const predictNavigationTimeoutMs = resolveE2EWaitTimeoutMs(15_000);

    const assertMarketDetailsOpened = async (): Promise<void> => {
      await Assertions.expectElementToBeVisible(marketDetailsScreen, {
        timeout: predictNavigationTimeoutMs,
        description: 'Predict market details screen after position tap',
      });
    };

    await Utilities.executeWithRetry(
      async () => {
        if (
          await WalletHomeScroll.tapIfAlreadyVisible(target, description, {
            tapTimeout: tapTimeoutMs,
          })
        ) {
          await assertMarketDetailsOpened();
          return;
        }

        await WalletHomeScroll.tryScrollDirections((direction) =>
          this.scrollPredictionsSectionIntoView(direction, {
            maxAttempts: intoViewMaxAttempts,
          }),
        );

        if (
          await WalletHomeScroll.tapIfAlreadyVisible(target, description, {
            tapTimeout: tapTimeoutMs,
          })
        ) {
          await assertMarketDetailsOpened();
          return;
        }

        await WalletHomeScroll.tryScrollDirections((direction) =>
          WalletHomeScroll.scrollAndTapSection(target, description, direction, {
            timeout: scrollAndTapPerDirectionMs,
            tapTimeout: tapTimeoutMs,
            overshootSwipe: {
              direction: direction === 'down' ? 'up' : 'down',
              percentage: 0.15,
            },
          }),
        );

        await assertMarketDetailsOpened();
      },
      {
        timeout: scrollAndTapRetryTimeoutMs,
        description: `Scroll and tap ${description}`,
      },
    );
  }

  async scrollAndTapNftsSection(): Promise<void> {
    await WalletHomeScroll.scrollAndTapSection(
      this.nftsSectionHeader,
      'NFTs section',
    );
  }

  async tapOnAvailableBalance(): Promise<void> {
    await Gestures.waitAndTap(this.availableBalanceLabel, {
      elemDescription: 'tap available balance to expand balance card',
    });
  }

  async tapClaimButton(): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        await WalletHomeScroll.scrollWalletHomeToElement(
          this.claimButton,
          'Claim button on wallet homepage',
        );
        await Gestures.waitAndTap(this.claimButton, {
          elemDescription: 'Claim Button',
          timeout: 30_000,
        });
      },
      {
        timeout: 90_000,
        description: 'Tap claim button on wallet homepage',
      },
    );
  }

  async tapClaimConfirmButton(): Promise<void> {
    await Gestures.waitAndTap(this.predictClaimConfirmButton, {
      elemDescription: 'Claim confirm button',
    });
  }
}

export default new WalletHomeSections();
