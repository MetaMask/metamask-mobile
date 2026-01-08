import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import Assertions from '../../framework/Assertions';

class TrendingView {
  get trendingTab(): DetoxElement {
    return Matchers.getElementByID('tab-bar-item-Trending');
  }

  get searchButton(): DetoxElement {
    return Matchers.getElementByID('explore-view-search-button');
  }

  get browserButton(): DetoxElement {
    return Matchers.getElementByID('trending-view-browser-button');
  }

  get searchInput(): DetoxElement {
    return Matchers.getElementByID('explore-view-search-input');
  }

  get searchCancelButton(): DetoxElement {
    return Matchers.getElementByID('explore-search-cancel-button');
  }

  getTokenRow(assetId: string): DetoxElement {
    return Matchers.getElementByID(`trending-token-row-item-${assetId}`);
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

  async tapViewAll(sectionTitle: string): Promise<void> {
    // This assumes the View All button is part of the section header structure.
    // Finding it reliably might require a specific testID in the app code if "View all" is generic.
    // For now, we try to find it near the section title or by index if known.
    // Ideally, app code should have testIDs like `section-header-view-all-${sectionId}`.
    const viewAllButton = Matchers.getElementByText('View all', 0); // Simplified for now
    await Gestures.tap(viewAllButton, {
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
}

export default new TrendingView();
