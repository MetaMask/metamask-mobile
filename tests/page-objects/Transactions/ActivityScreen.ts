import { ActivityScreenSelectorsIDs } from '../../../app/components/Views/ActivityScreen/ActivityScreen.testIds';
import {
  ActivityListSelectorsIDs,
  activityListRowItemTestId,
  activityListRowPendingSpinnerTestId,
  activityListRowSubtitleTestId,
  activityListRowTitleTestId,
} from '../../../app/components/Views/ActivityList/ActivityList.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import Assertions from '../../framework/Assertions';
import type { EncapsulatedElementType } from '../../framework';
import TabBarComponent from '../wallet/TabBarComponent';

/**
 * Mirrors app `ActivityTypeFilter` string values (testIDs use these suffixes).
 * Defined here so E2E does not import app `types.ts` (pulls Engine via adapters).
 */
export enum ActivityTypeFilter {
  All = 'all',
  Transactions = 'transactions',
  BuySell = 'buySell',
  Perps = 'perps',
  Predictions = 'predictions',
  MetamaskCard = 'metamaskCard',
}

class ActivityScreen {
  get screen(): EncapsulatedElementType {
    return Matchers.getElementByID(ActivityScreenSelectorsIDs.SAFE_AREA_VIEW);
  }

  get header(): EncapsulatedElementType {
    return Matchers.getElementByID(ActivityScreenSelectorsIDs.HEADER);
  }

  get backButton(): EncapsulatedElementType {
    return Matchers.getElementByID(ActivityScreenSelectorsIDs.BACK_BUTTON);
  }

  get networkFilterChip(): EncapsulatedElementType {
    return Matchers.getElementByID(
      ActivityScreenSelectorsIDs.NETWORK_FILTER_CHIP,
    );
  }

  get typeFilterChip(): EncapsulatedElementType {
    return Matchers.getElementByID(ActivityScreenSelectorsIDs.TYPE_FILTER_CHIP);
  }

  get typeFilterSheet(): EncapsulatedElementType {
    return Matchers.getElementByID(
      ActivityScreenSelectorsIDs.TYPE_FILTER_SHEET,
    );
  }

  get perpsFilterChip(): EncapsulatedElementType {
    return Matchers.getElementByID(
      ActivityScreenSelectorsIDs.PERPS_FILTER_CHIP,
    );
  }

  get perpsFilterSheet(): EncapsulatedElementType {
    return Matchers.getElementByID(
      ActivityScreenSelectorsIDs.PERPS_FILTER_SHEET,
    );
  }

  get emptyState(): EncapsulatedElementType {
    return Matchers.getElementByID(ActivityScreenSelectorsIDs.EMPTY_STATE);
  }

  get emptyStateListContainer(): EncapsulatedElementType {
    return Matchers.getElementByID(ActivityScreenSelectorsIDs.LIST);
  }

  emptyStateAction(label: string): EncapsulatedElementType {
    return Matchers.getElementByText(label);
  }

  typeFilterOption(filter: ActivityTypeFilter): EncapsulatedElementType {
    return Matchers.getElementByID(
      `${ActivityScreenSelectorsIDs.TYPE_FILTER_OPTION_PREFIX}${filter}`,
    );
  }

  get transactionList(): EncapsulatedElementType {
    return Matchers.getElementByID(ActivityListSelectorsIDs.CONTAINER);
  }

  get loadingIndicator(): EncapsulatedElementType {
    return Matchers.getElementByID(ActivityListSelectorsIDs.LOADING_INDICATOR);
  }

  transactionItem(index: number): EncapsulatedElementType {
    return Matchers.getElementByID(activityListRowItemTestId(index));
  }

  transactionTitle(hashOrIndex: string | number): EncapsulatedElementType {
    return Matchers.getElementByID(
      activityListRowTitleTestId(String(hashOrIndex)),
    );
  }

  transactionSubtitle(hashOrIndex: string | number): EncapsulatedElementType {
    return Matchers.getElementByID(
      activityListRowSubtitleTestId(String(hashOrIndex)),
    );
  }

  transactionPrimaryAmount(
    hashOrIndex: string | number,
  ): EncapsulatedElementType {
    return Matchers.getElementByID(`activity-primary-amount-${hashOrIndex}`);
  }

  transactionSecondaryAmount(
    hashOrIndex: string | number,
  ): EncapsulatedElementType {
    return Matchers.getElementByID(`activity-secondary-amount-${hashOrIndex}`);
  }

  get pendingSectionHeader(): EncapsulatedElementType {
    return Matchers.getElementByID('activity-list-date-header');
  }

  pendingSpinner(hashOrIndex: string | number): EncapsulatedElementType {
    return Matchers.getElementByID(
      activityListRowPendingSpinnerTestId(String(hashOrIndex)),
    );
  }

  async openFromTabBar(): Promise<void> {
    await Gestures.waitAndTap(TabBarComponent.tabBarActivityButton, {
      elemDescription: 'Activity tab',
      timeout: 10_000,
    });
    await this.expectIsVisible();
  }

  async expectIsVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.screen, {
      description: 'Activity redesign screen should be visible',
      timeout: 20_000,
    });
  }

  async expectEmptyStateVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.emptyState, {
      description: 'Activity empty state should be visible',
      timeout: 20_000,
    });
  }

  async expectEmptyStateNotVisible(): Promise<void> {
    await Assertions.expectElementToNotBeVisible(this.emptyState, {
      description: 'Activity empty state should not be visible',
      timeout: 20_000,
    });
  }

  async expectEmptyStateContent(
    description: string,
    actionLabel: string,
  ): Promise<void> {
    await this.expectEmptyStateVisible();
    await Assertions.expectTextDisplayed(description, {
      description: `Empty state description "${description}"`,
    });
    await Assertions.expectElementToBeVisible(
      this.emptyStateAction(actionLabel),
      {
        description: `Empty state CTA "${actionLabel}" should be visible`,
      },
    );
  }

  async selectTypeFilter(filter: ActivityTypeFilter): Promise<void> {
    await Gestures.waitAndTap(this.typeFilterChip, {
      elemDescription: 'Activity type filter chip',
    });
    await Assertions.expectElementToBeVisible(this.typeFilterSheet, {
      description: 'Activity type filter sheet should open',
    });
    await Gestures.waitAndTap(this.typeFilterOption(filter), {
      elemDescription: `Activity type filter option ${filter}`,
    });
  }

  async tapEmptyStateAction(actionLabel: string): Promise<void> {
    await Gestures.waitAndTap(this.emptyStateAction(actionLabel), {
      elemDescription: `Activity empty state CTA "${actionLabel}"`,
    });
  }

  async expectTransactionTitleVisible(hash: string): Promise<void> {
    await Assertions.expectElementToBeVisible(this.transactionTitle(hash), {
      description: `Activity row title for ${hash} should be visible`,
      timeout: 20_000,
    });
  }

  async tapTransactionItem(index: number): Promise<void> {
    await Gestures.waitAndTap(this.transactionItem(index), {
      elemDescription: `Activity transaction item at index ${index}`,
    });
  }

  async swipeDown(): Promise<void> {
    await Gestures.swipe(this.transactionList, 'down', {
      speed: 'slow',
      percentage: 0.5,
    });
  }
}

export default new ActivityScreen();
