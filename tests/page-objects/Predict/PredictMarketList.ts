import { Gestures, Matchers, Assertions } from '../../framework';
import {
  PredictMarketListSelectorsIDs,
  getPredictFeedSelector,
  getPredictMarketListSelector,
} from '../../../app/components/UI/Predict/Predict.testIds';

// Type for category tabs
type CategoryTab = 'trending' | 'new' | 'sports' | 'crypto' | 'politics';

class PredictMarketList {
  get container(): DetoxElement {
    return Matchers.getElementByID(PredictMarketListSelectorsIDs.CONTAINER);
  }

  get errorContainer(): DetoxElement {
    return Matchers.getElementByID(PredictMarketListSelectorsIDs.EMPTY_STATE);
  }

  get categoryTabs(): DetoxElement {
    return Matchers.getElementByID(PredictMarketListSelectorsIDs.CATEGORY_TABS);
  }
  get backButton(): DetoxElement {
    return Matchers.getElementByID(PredictMarketListSelectorsIDs.BACK_BUTTON);
  }

  getMarketCard(category: CategoryTab, cardIndex: number): DetoxElement {
    return Matchers.getElementByID(
      getPredictMarketListSelector.marketCardByCategory(category, cardIndex),
    );
  }

  getPositionItem(positionId: string): DetoxElement {
    return Matchers.getElementByID(`position-${positionId}`);
  }

  // Actions
  async tapMarketCard(
    category: CategoryTab = 'trending',
    cardIndex: number = 1,
  ): Promise<void> {
    const marketCard = this.getMarketCard(category, cardIndex);
    await Gestures.waitAndTap(marketCard, {
      elemDescription: `Tapping Predict Market Card ${cardIndex} in ${category} category`,
    });
  }

  async tapCategoryTab(category: CategoryTab): Promise<void> {
    const categoryLabels = {
      trending: 'Trending',
      new: 'New',
      sports: 'Sports',
      crypto: 'Crypto',
      politics: 'Politics',
    };

    const tabElement = (await Matchers.getElementByText(
      categoryLabels[category],
    )) as unknown as DetoxElement;
    await Gestures.waitAndTap(tabElement, {
      elemDescription: `Tapping ${category} category tab`,
    });
  }

  /**
   * Taps Yes on a feed card. Prefers stable testIDs; falls back to label text because
   * legacy Button / accessibility nesting may not expose nested testIDs to Detox on iOS.
   */
  async tapYesBasedOnCategoryAndIndex(
    category: CategoryTab = 'new',
    cardIndex: number = 1,
  ): Promise<void> {
    const cardId = getPredictMarketListSelector.marketCardByCategory(
      category,
      cardIndex,
    );
    await Assertions.expectElementToBeVisible(
      this.getMarketCard(category, cardIndex),
      {
        timeout: 30000,
        description: `Predict market card ${cardIndex} (${category}) should load before Yes tap`,
      },
    );

    const yesById = element(
      by.id(getPredictMarketListSelector.marketCardBetYes(category, cardIndex)),
    ) as unknown as DetoxElement;
    const yesByText = element(
      by.text('Yes').withAncestor(by.id(cardId)),
    ) as unknown as DetoxElement;
    const yesBySportLabel = element(
      by.text(/^YES · /).withAncestor(by.id(cardId)),
    ) as unknown as DetoxElement;

    try {
      await Gestures.waitAndTap(yesById, {
        timeout: 6000,
        elemDescription: `Tap Yes (testID) in ${category} feed index ${cardIndex}`,
      });
    } catch {
      try {
        await Gestures.waitAndTap(yesByText, {
          timeout: 12000,
          elemDescription: `Tap Yes (text) in ${category} feed index ${cardIndex}`,
        });
      } catch {
        await Gestures.waitAndTap(yesBySportLabel, {
          timeout: 12000,
          elemDescription: `Tap Yes (sports YES · price label) in ${category} feed index ${cardIndex}`,
        });
      }
    }
  }

  /**
   * Taps No on a feed card. After a full-screen / modal step, FlashList may recycle cells and
   * the per-card testID can briefly disappear; we fall back to matchers scoped to the list.
   */
  async tapNoBasedOnCategoryAndIndex(
    category: CategoryTab = 'new',
    cardIndex: number = 1,
  ): Promise<void> {
    const cardId = getPredictMarketListSelector.marketCardByCategory(
      category,
      cardIndex,
    );
    const listId = getPredictFeedSelector.marketList(category);

    const noById = element(
      by.id(getPredictMarketListSelector.marketCardBetNo(category, cardIndex)),
    ) as unknown as DetoxElement;
    const noByTextCard = element(
      by.text('No').withAncestor(by.id(cardId)),
    ) as unknown as DetoxElement;
    const noBySportCard = element(
      by.text(/^NO · /).withAncestor(by.id(cardId)),
    ) as unknown as DetoxElement;
    const noByTextList = element(
      by.text('No').withAncestor(by.id(listId)),
    ) as unknown as DetoxElement;
    const noBySportList = element(
      by.text(/^NO · /).withAncestor(by.id(listId)),
    ) as unknown as DetoxElement;

    try {
      await Gestures.waitAndTap(noById, {
        timeout: 6000,
        elemDescription: `Tap No (testID) in ${category} feed index ${cardIndex}`,
      });
    } catch {
      try {
        await Gestures.waitAndTap(noByTextCard, {
          timeout: 8000,
          elemDescription: `Tap No (text, card ancestor) in ${category} feed index ${cardIndex}`,
        });
      } catch {
        try {
          await Gestures.waitAndTap(noBySportCard, {
            timeout: 8000,
            elemDescription: `Tap No (sports label, card ancestor) in ${category} feed index ${cardIndex}`,
          });
        } catch {
          try {
            await Gestures.waitAndTap(noByTextList, {
              timeout: 12000,
              elemDescription: `Tap No (text, list ancestor) in ${category} feed index ${cardIndex}`,
            });
          } catch {
            await Gestures.waitAndTap(noBySportList, {
              timeout: 12000,
              elemDescription: `Tap No (sports label, list ancestor) in ${category} feed index ${cardIndex}`,
            });
          }
        }
      }
    }
  }

  async tapBackButton(): Promise<void> {
    await Gestures.waitAndTap(this.backButton, {
      elemDescription: 'Tap Back button on market feed',
    });
  }
}

export default new PredictMarketList();
