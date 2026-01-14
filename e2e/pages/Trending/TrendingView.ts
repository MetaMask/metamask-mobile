import { Matchers, Gestures, Assertions } from '../../framework';
import {
  TrendingViewSelectorsIDs,
  TrendingViewSelectorsText,
} from '../../selectors/Trending/TrendingView.selectors';
import { PredictMarketListSelectorsIDs } from '../../selectors/Predict/Predict.selectors';

// Map section to its full view back button Test ID
const SECTION_BACK_BUTTONS: Record<string, string> = {
  [TrendingViewSelectorsText.SECTION_TOKENS]:
    'trending-tokens-header-back-button',
  [TrendingViewSelectorsText.SECTION_PERPS]:
    'perps-market-list-close-button-back-button',
  [TrendingViewSelectorsText.SECTION_SITES]:
    'sites-full-view-header-back-button',
  // Trying 'back-button' first, but if that fails, we might need a better selector.
  // Based on Predict.selectors.ts, it's 'back-button'.
  // If it's ListHeaderWithSearch without testID, it might be just 'back-button' if passed directly?
  // Or 'header-back' if it uses standard navbar.
  [TrendingViewSelectorsText.SECTION_PREDICTIONS]: 'back-button',
};

class TrendingView {
  get trendingTab(): DetoxElement {
    return Matchers.getElementByID(TrendingViewSelectorsIDs.TAB_BAR_ITEM);
  }

  get searchButton(): DetoxElement {
    return Matchers.getElementByID(TrendingViewSelectorsIDs.SEARCH_BUTTON);
  }

  get browserButton(): DetoxElement {
    return Matchers.getElementByID(TrendingViewSelectorsIDs.BROWSER_BUTTON);
  }

  get searchInput(): DetoxElement {
    return Matchers.getElementByID(TrendingViewSelectorsIDs.SEARCH_INPUT);
  }

  get searchCancelButton(): DetoxElement {
    return Matchers.getElementByID(
      TrendingViewSelectorsIDs.SEARCH_CANCEL_BUTTON,
    );
  }

  get googleSearchButton(): DetoxElement {
    return Matchers.getElementByID(
      TrendingViewSelectorsIDs.SEARCH_FOOTER_GOOGLE_LINK,
    );
  }

  getTokenRow(assetId: string): DetoxElement {
    return Matchers.getElementByID(
      `${TrendingViewSelectorsIDs.TOKEN_ROW_ITEM_PREFIX}${assetId}`,
      0,
    );
  }

  getPerpRow(symbol: string): DetoxElement {
    return Matchers.getElementByID(
      `${TrendingViewSelectorsIDs.PERPS_ROW_ITEM_PREFIX}${symbol}`,
      0,
    );
  }

  getPredictionRow(id: string): DetoxElement {
    return Matchers.getElementByID(
      `${TrendingViewSelectorsIDs.PREDICTIONS_ROW_ITEM_PREFIX}${id}`,
      0,
    );
  }

  getSiteRow(name: string): DetoxElement {
    return Matchers.getElementByText(name);
  }

  getSectionHeader(title: string): DetoxElement {
    return Matchers.getElementByText(title);
  }

  getBackButton(testID: string): DetoxElement {
    return Matchers.getElementByID(testID);
  }

  async tapTrendingTab(): Promise<void> {
    await Gestures.tap(this.trendingTab, {
      elemDescription: 'Tap Trending tab',
    });
  }

  async tapSearchButton(): Promise<void> {
    await Gestures.tap(this.searchButton, {
      elemDescription: 'Tap Search button',
    });
  }

  async tapBrowserButton(): Promise<void> {
    await Gestures.tap(this.browserButton, {
      elemDescription: 'Tap Browser button',
    });
  }

  async typeSearchQuery(query: string): Promise<void> {
    await Gestures.typeText(this.searchInput, query, {
      elemDescription: 'Type search query',
    });
  }

  async tapSearchCancelButton(): Promise<void> {
    await Gestures.tap(this.searchCancelButton, {
      elemDescription: 'Tap Search Cancel button',
    });
  }

  /**
   * Generic method to scroll to an element in the trending feed.
   * This ensures elements are visible and hittable before interaction.
   * Works regardless of section order changes.
   */
  private async scrollToElementInFeed(
    element: DetoxElement,
    description: string,
    direction: 'up' | 'down' = 'down',
  ): Promise<void> {
    await Gestures.scrollToElement(
      element,
      Matchers.getIdentifier('trending-feed-scroll-view'),
      {
        direction,
        scrollAmount: 300,
        elemDescription: description,
      },
    );
  }

  async tapViewAll(sectionTitle: string): Promise<void> {
    const sectionIdMap: Record<string, string> = {
      Tokens: 'tokens',
      Sites: 'sites',
      Predictions: 'predictions',
      Perps: 'perps',
    };
    const id = sectionIdMap[sectionTitle] || sectionTitle.toLowerCase();
    const viewAllButton = Matchers.getElementByID(
      `section-header-view-all-${id}`,
    );

    // Determine scroll direction: Predictions and Tokens are usually near top
    // But scrollToElement can handle both directions, so we try 'down' first
    // and it will automatically adjust if needed
    const direction =
      sectionTitle === 'Predictions' || sectionTitle === 'Tokens'
        ? 'up'
        : 'down';

    // Use generic scroll method
    await this.scrollToElementInFeed(
      viewAllButton,
      `Scroll to ${sectionTitle} View All button`,
      direction,
    );

    await Gestures.tap(viewAllButton, {
      elemDescription: `Tap View All for ${sectionTitle}`,
    });
  }

  async tapBackFromFullView(sectionTitle: string): Promise<void> {
    const backButtonID = SECTION_BACK_BUTTONS[sectionTitle];
    if (!backButtonID) {
      throw new Error(`Unknown back button for section: ${sectionTitle}`);
    }

    await Gestures.tap(this.getBackButton(backButtonID), {
      elemDescription: `Tap Back Button from ${sectionTitle} Full View`,
      checkStability: true,
    });
  }

  // --- Details Page Navigation ---

  async tapBackFromTokenDetails(): Promise<void> {
    // Uses 'back-arrow-button' which is common for AssetOverview/Navbar in E2E
    const backButtonID = 'back-arrow-button';

    await Gestures.tap(this.getBackButton(backButtonID), {
      elemDescription: 'Tap Back from Token Details',
    });
  }

  async tapBackFromPerpDetails(): Promise<void> {
    await Gestures.tap(this.getBackButton('perps-market-header-back-button'), {
      elemDescription: 'Tap Back from Perp Details',
    });
  }

  async tapBackFromPredictionDetails(): Promise<void> {
    await Gestures.tap(
      this.getBackButton('predict-market-details-back-button'),
      {
        elemDescription: 'Tap Back from Prediction Details',
      },
    );
  }

  async tapBackFromBrowser(): Promise<void> {
    // Assuming we can return by tapping the active tab if visible
    await this.tapTrendingTab();
  }

  // --- Verification ---

  async verifyFeedVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.searchButton, {
      description: 'Explore Feed Search Button should be visible',
    });
  }

  async verifyTokenVisible(assetId: string): Promise<void> {
    await Assertions.expectElementToBeVisible(this.getTokenRow(assetId), {
      description: `Token row for ${assetId} should be visible`,
    });
  }

  async tapTokenRow(assetId: string): Promise<void> {
    const tokenRow = this.getTokenRow(assetId);

    // Use generic scroll method to ensure element is visible
    await this.scrollToElementInFeed(
      tokenRow,
      `Scroll to token row ${assetId}`,
    );

    await Gestures.tap(tokenRow, {
      elemDescription: `Tap token row ${assetId}`,
    });
  }

  async verifyPerpVisible(symbol: string): Promise<void> {
    await Assertions.expectElementToBeVisible(this.getPerpRow(symbol), {
      description: `Perp row for ${symbol} should be visible`,
    });
  }

  async tapPerpRow(symbol: string): Promise<void> {
    const perpRow = this.getPerpRow(symbol);

    // Use generic scroll method to ensure element is visible
    await this.scrollToElementInFeed(perpRow, `Scroll to ${symbol} Perp row`);

    await Gestures.tap(perpRow, {
      elemDescription: `Tap perp row ${symbol}`,
    });
  }

  async verifyPredictionVisible(id: string): Promise<void> {
    await Assertions.expectElementToBeVisible(this.getPredictionRow(id), {
      description: `Prediction row for ${id} should be visible`,
    });
  }

  async tapPredictionRow(id: string): Promise<void> {
    const predictionRow = this.getPredictionRow(id);

    // Use generic scroll method to ensure element is visible
    await this.scrollToElementInFeed(
      predictionRow,
      `Scroll to prediction row ${id}`,
    );

    await Gestures.tap(predictionRow, {
      elemDescription: `Tap prediction row ${id}`,
    });
  }

  async verifySiteVisible(name: string): Promise<void> {
    await Assertions.expectElementToBeVisible(this.getSiteRow(name), {
      description: `Site row for ${name} should be visible`,
    });
  }

  async tapSiteRow(name: string): Promise<void> {
    const siteRow = this.getSiteRow(name);

    // Use generic scroll method to ensure element is visible
    await this.scrollToElementInFeed(siteRow, `Scroll to ${name} Site row`);

    await Gestures.tap(siteRow, {
      elemDescription: `Tap site row ${name}`,
    });
  }

  async verifySectionHeaderVisible(title: string): Promise<void> {
    await Assertions.expectElementToBeVisible(this.getSectionHeader(title), {
      description: `${title} section header should be visible`,
    });
  }

  async verifyDetailsTitleVisible(title: string): Promise<void> {
    await Assertions.expectElementToBeVisible(
      Matchers.getElementByText(title),
      {
        description: `Details page title ${title} should be visible`,
      },
    );
  }

  async verifyTokenDetailsTitleVisible(title: string): Promise<void> {
    // Use a specific element on the details page if possible to distinguish from feed row.
    // For now, rely on title text but maybe we should ensure we are NOT on feed?
    // But this method is generic.
    await this.verifyDetailsTitleVisible(title);
  }

  async verifyPredictionDetailsVisible(): Promise<void> {
    // Verify we are on Predict market details page by checking for the screen container
    await Assertions.expectElementToBeVisible(
      Matchers.getElementByID('predict-market-details-screen'),
      {
        description: 'Predict market details screen should be visible',
      },
    );
  }

  async verifyPerpDetailsVisible(): Promise<void> {
    // Verify we are on Perps market details page by checking for the container
    await Assertions.expectElementToBeVisible(
      Matchers.getElementByID('perps-market-details-view'),
      {
        description: 'Perps market details view should be visible',
      },
    );
  }

  async verifyPredictionsTabsVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(
      Matchers.getElementByID(PredictMarketListSelectorsIDs.CATEGORY_TABS),
      {
        description: 'Predictions Category Tabs should be visible (Full View)',
      },
    );
  }

  async verifyGoogleSearchOptionVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.googleSearchButton, {
      description: 'Google search option should be visible',
    });
  }

  async verifyBrowserUrlVisible(urlFragment: string): Promise<void> {
    await Assertions.expectElementToBeVisible(
      Matchers.getElementByText(urlFragment, 0),
      {
        description: `Browser should show ${urlFragment}`,
      },
    );
  }
}

export default new TrendingView();
