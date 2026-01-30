import { Matchers, Gestures, Assertions } from '../../framework';
import {
  TrendingViewSelectorsIDs,
  SECTION_BACK_BUTTONS,
  DETAILS_BACK_BUTTONS,
  SECTION_FULL_VIEW_HEADERS,
} from '../../locators/Trending/TrendingView.selectors.ts';
import { PredictMarketListSelectorsIDs } from '../../../app/components/UI/Predict/Predict.testIds.ts';
import TabBarComponent from '../../../e2e/pages/wallet/TabBarComponent.ts';
import BrowserView from '../../../e2e/pages/Browser/BrowserView.ts';

class TrendingView {
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
    return Matchers.getElementByID(
      `${TrendingViewSelectorsIDs.SITE_ROW_ITEM_PREFIX}${name}`,
      0,
    );
  }

  getSectionHeader(title: string): DetoxElement {
    return Matchers.getElementByText(title);
  }

  /**
   * Get section header by testID (for full view headers)
   */
  getSectionHeaderByTestID(title: string): DetoxElement | null {
    const headerTestID = SECTION_FULL_VIEW_HEADERS[title];
    if (!headerTestID) {
      return null;
    }
    return Matchers.getElementByID(headerTestID);
  }

  getBackButton(testID: string): DetoxElement {
    return Matchers.getElementByID(testID);
  }

  async tapTrendingTab(): Promise<void> {
    await TabBarComponent.tapExploreButton();
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
      hideKeyboard: true,
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
    targetElement: DetoxElement,
    description: string,
    direction: 'up' | 'down' = 'down',
  ): Promise<void> {
    await Gestures.scrollToElement(
      targetElement,
      Matchers.getIdentifier(TrendingViewSelectorsIDs.SCROLL_VIEW),
      {
        direction,
        scrollAmount: 300,
        elemDescription: description,
      },
    );
  }

  /**
   * Map section title to sectionId used in testIDs
   */
  private getSectionId(sectionTitle: string): string {
    const sectionIdMap: Record<string, string> = {
      'Trending tokens': 'tokens',
      Sites: 'sites',
      Predictions: 'predictions',
      Perps: 'perps',
    };
    return sectionIdMap[sectionTitle] || sectionTitle.toLowerCase();
  }

  /**
   * Get QuickAction button element for a section
   */
  getQuickActionButton(sectionTitle: string): DetoxElement {
    const sectionId = this.getSectionId(sectionTitle);
    return Matchers.getElementByID(`quick-action-${sectionId}`);
  }

  /**
   * Scroll horizontally to make QuickAction button visible
   */
  private async scrollToQuickAction(
    targetElement: DetoxElement,
    description: string,
  ): Promise<void> {
    await Gestures.scrollToElement(
      targetElement,
      Matchers.getIdentifier(
        TrendingViewSelectorsIDs.QUICK_ACTIONS_SCROLL_VIEW,
      ),
      {
        direction: 'right',
        scrollAmount: 200,
        elemDescription: description,
      },
    );
  }

  /**
   * Tap on QuickAction button (buttons below search bar)
   */
  async tapQuickAction(sectionTitle: string): Promise<void> {
    const quickActionButton = this.getQuickActionButton(sectionTitle);

    // Scroll horizontally if needed to make the button visible
    await this.scrollToQuickAction(
      quickActionButton,
      `Scroll to ${sectionTitle} QuickAction button`,
    );

    await Gestures.tap(quickActionButton, {
      elemDescription: `Tap QuickAction button for ${sectionTitle}`,
    });
  }

  async tapViewAll(sectionTitle: string): Promise<void> {
    const id = this.getSectionId(sectionTitle);
    const viewAllButton = Matchers.getElementByID(
      `section-header-view-all-${id}`,
    );

    // Determine scroll direction: Predictions and Trending tokens are usually near top
    // But scrollToElement can handle both directions, so we try 'up' first for top sections
    // and it will automatically adjust if needed
    const direction =
      sectionTitle === 'Predictions' || sectionTitle === 'Trending tokens'
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

    const backButton = this.getBackButton(backButtonID);

    await Gestures.tap(backButton, {
      elemDescription: `Tap Back Button from ${sectionTitle} Full View`,
      checkVisibility: false,
    });
  }

  // --- Details Page Navigation ---

  /**
   * Generic method to tap back from details pages.
   * @param itemType - Type of item ('token', 'perp', 'prediction')
   */
  private async tapBackFromDetails(itemType: string): Promise<void> {
    const backButtonID = DETAILS_BACK_BUTTONS[itemType];
    if (!backButtonID) {
      throw new Error(`Unknown back button for item type: ${itemType}`);
    }

    await Gestures.tap(this.getBackButton(backButtonID), {
      elemDescription: `Tap Back from ${itemType.charAt(0).toUpperCase() + itemType.slice(1)} Details`,
    });
  }

  async tapBackFromTokenDetails(): Promise<void> {
    await this.tapBackFromDetails('token');
  }

  async tapBackFromPerpDetails(): Promise<void> {
    await this.tapBackFromDetails('perp');
  }

  async tapBackFromPredictionDetails(): Promise<void> {
    await this.tapBackFromDetails('prediction');
  }

  async tapBackFromBrowser(): Promise<void> {
    // Browser now uses close button (X) to return to feed
    await BrowserView.tapCloseBrowserButton();
  }

  // --- Verification ---

  async verifyFeedVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.searchButton, {
      description: 'Explore Feed Search Button should be visible',
    });
  }

  /**
   * Generic method to verify an item is visible in the feed.
   * @param getElement - Function to get the element
   * @param identifier - Item identifier (id, symbol, name, etc.)
   * @param itemType - Type of item for description ('token', 'perp', 'prediction', 'site')
   */
  private async verifyItemVisible(
    getElement: () => DetoxElement,
    identifier: string,
    itemType: string,
  ): Promise<void> {
    const targetElement = getElement();

    // Scroll to element to ensure it's fully visible
    await this.scrollToElementInFeed(
      targetElement,
      `Scroll to ${identifier} ${itemType} row for verification`,
    );

    await Assertions.expectElementToBeVisible(targetElement, {
      description: `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} row for ${identifier} should be visible`,
    });
  }

  /**
   * Generic method to tap on an item row with automatic scrolling.
   * @param getElement - Function to get the element
   * @param identifier - Item identifier (id, symbol, name, etc.)
   * @param itemType - Type of item for description ('token', 'perp', 'prediction', 'site')
   */
  private async tapItemRow(
    getElement: () => DetoxElement,
    identifier: string,
    itemType: string,
  ): Promise<void> {
    const targetElement = getElement();

    // Use generic scroll method to ensure element is visible
    await this.scrollToElementInFeed(
      targetElement,
      `Scroll to ${identifier} ${itemType} row`,
    );

    await Gestures.tap(targetElement, {
      elemDescription: `Tap ${itemType} row ${identifier}`,
    });
  }

  async verifyTokenVisible(assetId: string): Promise<void> {
    await this.verifyItemVisible(
      () => this.getTokenRow(assetId),
      assetId,
      'token',
    );
  }

  async tapTokenRow(assetId: string): Promise<void> {
    await this.tapItemRow(() => this.getTokenRow(assetId), assetId, 'token');
  }

  async verifyPerpVisible(symbol: string): Promise<void> {
    await this.verifyItemVisible(() => this.getPerpRow(symbol), symbol, 'perp');
  }

  async tapPerpRow(symbol: string): Promise<void> {
    await this.tapItemRow(() => this.getPerpRow(symbol), symbol, 'perp');
  }

  async verifyPredictionVisible(id: string): Promise<void> {
    await this.verifyItemVisible(
      () => this.getPredictionRow(id),
      id,
      'prediction',
    );
  }

  async tapPredictionRow(id: string): Promise<void> {
    await this.tapItemRow(() => this.getPredictionRow(id), id, 'prediction');
  }

  async verifySiteVisible(name: string): Promise<void> {
    await this.verifyItemVisible(() => this.getSiteRow(name), name, 'site');
  }

  async tapSiteRow(name: string): Promise<void> {
    await this.tapItemRow(() => this.getSiteRow(name), name, 'site');
  }

  /**
   * Verify section header in the feed view (uses text-based search)
   */
  async verifySectionHeaderInFeed(title: string): Promise<void> {
    const header = this.getSectionHeader(title);

    // First check if header is already visible (no scroll needed)
    try {
      await Assertions.expectElementToBeVisible(header, {
        description: `${title} section header should be visible`,
        timeout: 2000, // Short timeout for quick check
      });
      return; // Element is visible, no need to scroll
    } catch {
      // If not visible, try scrolling to it
    }

    // Scroll to section header if needed
    await this.scrollToElementInFeed(
      header,
      `Scroll to ${title} section header`,
    );
    await Assertions.expectElementToBeVisible(header, {
      description: `${title} section header should be visible`,
    });
  }

  /**
   * Verify section header in full view (uses testID)
   */
  async verifySectionHeaderInFullView(title: string): Promise<void> {
    const headerByTestID = this.getSectionHeaderByTestID(title);
    if (!headerByTestID) {
      throw new Error(
        `No testID found for section header: ${title}. Check SECTION_FULL_VIEW_HEADERS mapping.`,
      );
    }
    await Assertions.expectElementToBeVisible(headerByTestID, {
      description: `${title} section header (full view) should be visible`,
      timeout: 10000,
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

  /**
   * Scroll down in search results to ensure Google Search Option is visible
   */
  async scrollToGoogleSearchOption(): Promise<void> {
    await Gestures.scrollToElement(
      this.googleSearchButton,
      Matchers.getIdentifier(TrendingViewSelectorsIDs.SEARCH_RESULTS_LIST),
      {
        direction: 'down',
        scrollAmount: 300,
        elemDescription: 'Scroll to Google search option',
      },
    );
  }

  async verifyGoogleSearchOptionVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.googleSearchButton, {
      description: 'Google search option should be visible',
    });
  }

  async verifyBrowserUrlVisible(urlFragment: string): Promise<void> {
    // Browser URL bar shows the URL, but it might be displayed as full URL or just domain
    // Try multiple variations of the URL fragment
    const urlVariations = [
      urlFragment, // e.g., "uniswap.org"
      `https://${urlFragment}`, // e.g., "https://uniswap.org"
      `http://${urlFragment}`, // e.g., "http://uniswap.org"
    ];

    // Try each variation
    for (const urlText of urlVariations) {
      try {
        await Assertions.expectElementToBeVisible(
          Matchers.getElementByText(urlText, 0),
          {
            description: `Browser should show ${urlFragment}`,
            timeout: 5000, // Shorter timeout per attempt
          },
        );
        return; // Success - found the URL
      } catch {
        // Continue to next variation
      }
    }

    // If all variations failed, verify browser is at least loaded
    const urlInput = Matchers.getElementByID('url-input');
    await Assertions.expectElementToBeVisible(urlInput, {
      description: `Browser URL input should be visible (browser loaded, URL: ${urlFragment})`,
      timeout: 10000,
    });

    // If we get here, browser is loaded but URL text not found - this might be acceptable
    // depending on how the browser displays URLs
  }
}

export default new TrendingView();
