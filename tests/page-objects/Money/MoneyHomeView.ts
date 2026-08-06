import { MoneyActionButtonRowTestIds } from '../../../app/components/UI/Money/components/MoneyActionButtonRow/MoneyActionButtonRow.testIds';
import { MoneyActivityListTestIds } from '../../../app/components/UI/Money/components/MoneyActivityList/MoneyActivityList.testIds';
import { MoneyActivityLoadingTestIds } from '../../../app/components/UI/Money/components/MoneyActivityLoading/MoneyActivityLoading.testIds';
import { MoneyBalanceSummaryTestIds } from '../../../app/components/UI/Money/components/MoneyBalanceSummary/MoneyBalanceSummary.testIds';
import { MoneyEarningsTestIds } from '../../../app/components/UI/Money/components/MoneyEarnings/MoneyEarnings.testIds';
import { MoneyOnboardingCardTestIds } from '../../../app/components/UI/Money/components/MoneyOnboardingCard/MoneyOnboardingCard.testIds';
import { MoneyHomeViewTestIds } from '../../../app/components/UI/Money/Views/MoneyHomeView/MoneyHomeView.testIds';
import Assertions from '../../framework/Assertions';
import {
  asPlaywrightElement,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import Matchers from '../../framework/Matchers';
import Utilities from '../../framework/Utilities';

const MONEY_HOME_LOAD_TIMEOUT_MS = 60_000;

class MoneyHomeView {
  get balance(): EncapsulatedElementType {
    return Matchers.getElementByID(MoneyBalanceSummaryTestIds.BALANCE);
  }

  get apy(): EncapsulatedElementType {
    return Matchers.getElementByID(MoneyBalanceSummaryTestIds.APY);
  }

  get unavailableBalance(): EncapsulatedElementType {
    return Matchers.getElementByID(
      MoneyBalanceSummaryTestIds.BALANCE_UNAVAILABLE,
    );
  }

  get noAccountBalance(): EncapsulatedElementType {
    return Matchers.getElementByID(
      MoneyBalanceSummaryTestIds.BALANCE_NO_ACCOUNT,
    );
  }

  get activityLoading(): EncapsulatedElementType {
    return Matchers.getElementByID(MoneyActivityLoadingTestIds.CONTAINER);
  }

  get resolvedEmptyActivity(): EncapsulatedElementType {
    return Matchers.getElementByID(
      MoneyHomeViewTestIds.ACTIVITY_RESOLVED_EMPTY,
    );
  }

  get resolvedFilledActivity(): EncapsulatedElementType {
    return Matchers.getElementByID(
      MoneyHomeViewTestIds.ACTIVITY_RESOLVED_FILLED,
    );
  }

  get resolvedActivity(): EncapsulatedElementType {
    return Matchers.getElementByID(
      // TODO: Clean up
      /money-home-view-scroll-view-activity-resolved-(empty|filled)/,
    );
  }

  get activityError(): EncapsulatedElementType {
    return Matchers.getElementByID(MoneyHomeViewTestIds.ACTIVITY_ERROR);
  }

  get activityList(): EncapsulatedElementType {
    return Matchers.getElementByID(MoneyActivityListTestIds.CONTAINER);
  }

  get stepperCardTitle(): EncapsulatedElementType {
    return Matchers.getElementByID(MoneyOnboardingCardTestIds.TITLE);
  }

  get earnings(): EncapsulatedElementType {
    return Matchers.getElementByID(MoneyEarningsTestIds.CONTAINER);
  }

  get monthlyEarningsLabel(): EncapsulatedElementType {
    return Matchers.getElementByID(MoneyEarningsTestIds.MONTHLY_LABEL);
  }

  get monthlyEarningsValue(): EncapsulatedElementType {
    return Matchers.getElementByID(MoneyEarningsTestIds.LAST_30_DAYS_VALUE);
  }

  get lifetimeEarningsLabel(): EncapsulatedElementType {
    return Matchers.getElementByID(MoneyEarningsTestIds.LIFETIME_LABEL);
  }

  get lifetimeEarningsValue(): EncapsulatedElementType {
    return Matchers.getElementByID(MoneyEarningsTestIds.SINCE_INCEPTION_VALUE);
  }

  get sendButton(): EncapsulatedElementType {
    return Matchers.getElementByID(MoneyActionButtonRowTestIds.TRANSFER_BUTTON);
  }

  async waitForActivityLoading(
    timeout = MONEY_HOME_LOAD_TIMEOUT_MS,
  ): Promise<void> {
    await Assertions.expectElementToBeVisible(this.activityLoading, {
      description: 'Money Home activity loading indicator should be visible',
      timeout,
    });
  }

  async waitForResolvedFilledActivity(
    timeout = MONEY_HOME_LOAD_TIMEOUT_MS,
  ): Promise<void> {
    await this.waitForActivityState(
      this.resolvedFilledActivity,
      'resolve with activity',
      timeout,
    );
  }

  async waitForResolvedActivity(
    timeout = MONEY_HOME_LOAD_TIMEOUT_MS,
  ): Promise<void> {
    await this.waitForActivityState(this.resolvedActivity, 'resolve', timeout);
  }

  async waitForEmptyBalanceLoaded(
    timeout = MONEY_HOME_LOAD_TIMEOUT_MS,
  ): Promise<void> {
    const balanceText = await this.waitForBalanceText(timeout);
    const balance = this.parseBalance(balanceText);

    if (balance !== 0) {
      throw new Error(
        `Expected Money Home to resolve an empty balance, received "${balanceText}".`,
      );
    }
  }

  async waitForFundedBalanceLoaded(
    timeout = MONEY_HOME_LOAD_TIMEOUT_MS,
  ): Promise<void> {
    const balanceText = await this.waitForBalanceText(timeout);
    const balance = this.parseBalance(balanceText);

    if (balance <= 0) {
      throw new Error(
        `Expected Money Home to resolve a funded balance, received "${balanceText}".`,
      );
    }
  }

  async expectApyVisible(timeout = MONEY_HOME_LOAD_TIMEOUT_MS): Promise<void> {
    await Assertions.expectElementToExist(this.apy, {
      description: 'Money Home APY should be present',
      timeout,
    });
  }

  async waitForEarningsDataLoaded(
    timeout = MONEY_HOME_LOAD_TIMEOUT_MS,
  ): Promise<void> {
    // Keep only 1 assertion for data fetching and breakout validation checks out of measure().
    await Assertions.expectElementToExist(this.lifetimeEarningsValue, {
      description: 'Money Home Lifetime earnings value should be populated',
      timeout,
    });
  }

  async expectEarningsSectionRendered(
    timeout = MONEY_HOME_LOAD_TIMEOUT_MS,
  ): Promise<void> {
    await Assertions.expectElementToExist(this.earnings, {
      description: 'Money Home Earnings section should exist',
      timeout,
    });
    await Assertions.expectElementToExist(this.monthlyEarningsLabel, {
      description: 'Money Home Monthly earnings label should exist',
      timeout,
    });
    await Assertions.expectElementToExist(this.monthlyEarningsValue, {
      description: 'Money Home Monthly earnings value should be populated',
      timeout,
    });
    await Assertions.expectElementToExist(this.lifetimeEarningsLabel, {
      description: 'Money Home Lifetime earnings label should exist',
      timeout,
    });
  }

  async expectOnboardingCardTitleVisible(
    timeout = MONEY_HOME_LOAD_TIMEOUT_MS,
  ): Promise<void> {
    await Assertions.expectElementToExist(this.stepperCardTitle, {
      description: 'Money onboarding card title should be present',
      timeout,
    });
  }

  async expectNoActivityPreview(
    timeout = MONEY_HOME_LOAD_TIMEOUT_MS,
  ): Promise<void> {
    await Assertions.expectElementToNotBeVisible(this.activityList, {
      description:
        'Money Home activity preview should be absent after an empty resolution',
      timeout,
    });
  }

  async expectActivityPreview(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.activityList, {
      description: 'Money Home activity preview should be visible',
      timeout: MONEY_HOME_LOAD_TIMEOUT_MS,
    });
  }

  async expectSendButtonDisabled(
    timeout = MONEY_HOME_LOAD_TIMEOUT_MS,
  ): Promise<void> {
    await Utilities.waitForElementToBeDisabled(this.sendButton, timeout);
  }

  async expectSendButtonEnabled(
    timeout = MONEY_HOME_LOAD_TIMEOUT_MS,
  ): Promise<void> {
    await Utilities.waitForElementToBeEnabled(this.sendButton, timeout);
  }

  private async waitForBalanceText(timeout: number): Promise<string> {
    try {
      await Assertions.expectElementToBeVisible(this.balance, {
        description: 'Money Home fresh balance should be visible',
        timeout,
      });
    } catch (error) {
      await this.throwIfBalanceUnavailable();
      throw error;
    }

    return (await asPlaywrightElement(this.balance)).textContent();
  }

  private async waitForActivityState(
    expectedState: EncapsulatedElementType,
    expectedDescription: string,
    timeout: number,
  ): Promise<void> {
    try {
      await Assertions.expectElementToBeVisible(expectedState, {
        description: `Money Home activity should ${expectedDescription}`,
        timeout,
      });
    } catch (error) {
      await this.throwIfActivityFailed();
      throw error;
    }

    await this.throwIfActivityFailed();
  }

  private async throwIfBalanceUnavailable(): Promise<void> {
    const [isUnavailable, hasNoAccount] = await Promise.all([
      (await asPlaywrightElement(this.unavailableBalance)).isVisible(),
      (await asPlaywrightElement(this.noAccountBalance)).isVisible(),
    ]);

    if (isUnavailable) {
      throw new Error(
        'Money Home balance request resolved without a fresh balance.',
      );
    }

    if (hasNoAccount) {
      throw new Error('Money Home did not create or select a Money account.');
    }
  }

  private async throwIfActivityFailed(): Promise<void> {
    const isActivityErrorVisible = await (
      await asPlaywrightElement(this.activityError)
    ).isVisible();

    if (isActivityErrorVisible) {
      throw new Error('Money Home activity request failed.');
    }
  }

  private parseBalance(balanceText: string): number {
    const normalized = balanceText.replace(/[^0-9.,-]/gu, '');
    const numericValue = Number(normalized.replace(/,/gu, ''));

    if (!Number.isFinite(numericValue)) {
      throw new Error(
        `Unable to parse Money Home balance text "${balanceText}".`,
      );
    }

    return numericValue;
  }
}

export default new MoneyHomeView();
