import { Matchers, Gestures, Assertions } from '../../framework';
import {
  TrendingViewSelectorsIDs,
  TrendingViewSelectorsText,
} from '../../selectors/Trending/TrendingView.selectors';

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

  get viewAllButton(): DetoxElement {
    return Matchers.getElementByText(TrendingViewSelectorsText.VIEW_ALL, 0);
  }

  get googleSearchButton(): DetoxElement {
    return Matchers.getElementByID(
      TrendingViewSelectorsIDs.SEARCH_FOOTER_GOOGLE_LINK,
    );
  }

  getTokenRow(assetId: string): DetoxElement {
    return Matchers.getElementByID(
      `${TrendingViewSelectorsIDs.TOKEN_ROW_ITEM_PREFIX}${assetId}`,
    );
  }

  getSectionHeader(title: string): DetoxElement {
    return Matchers.getElementByText(title);
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

  async tapViewAll(sectionTitle: string): Promise<void> {
    // This assumes the View All button is part of the section header structure.
    // Finding it reliably might require a specific testID in the app code if "View all" is generic.
    // For now, we try to find it near the section title or by index if known.
    // Ideally, app code should have testIDs like `section-header-view-all-${sectionId}`.
    await Gestures.tap(this.viewAllButton, {
      elemDescription: `Tap View All for ${sectionTitle}`,
    });
  }

  async verifyTokenVisible(assetId: string): Promise<void> {
    await Assertions.expectElementToBeVisible(this.getTokenRow(assetId), {
      description: `Token row for ${assetId} should be visible`,
    });
  }

  async tapTokenRow(assetId: string): Promise<void> {
    await Gestures.tap(this.getTokenRow(assetId), {
      elemDescription: `Tap token row ${assetId}`,
    });
  }

  async verifySectionHeaderVisible(title: string): Promise<void> {
    await Assertions.expectElementToBeVisible(this.getSectionHeader(title), {
      description: `${title} section header should be visible`,
    });
  }

  async verifyTokenDetailsTitleVisible(title: string): Promise<void> {
    await Assertions.expectElementToBeVisible(
      Matchers.getElementByText(title),
      {
        description: `Token details page title ${title} should be visible`,
      },
    );
  }

  async verifyGoogleSearchOptionVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.googleSearchButton, {
      description: 'Google search option should be visible',
    });
  }
}

export default new TrendingView();
