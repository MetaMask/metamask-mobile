import { MoneyActionButtonRowTestIds } from '../../../app/components/UI/Money/components/MoneyActionButtonRow/MoneyActionButtonRow.testIds';
import { MoneyBalanceSummaryTestIds } from '../../../app/components/UI/Money/components/MoneyBalanceSummary/MoneyBalanceSummary.testIds';
import { MoneyEarningsTestIds } from '../../../app/components/UI/Money/components/MoneyEarnings/MoneyEarnings.testIds';
import { MoneyOnboardingCardTestIds } from '../../../app/components/UI/Money/components/MoneyOnboardingCard/MoneyOnboardingCard.testIds';
import Assertions from '../../framework/Assertions';
import {
  asPlaywrightElement,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import Matchers from '../../framework/Matchers';
import Utilities from '../../framework/Utilities';

const MONEY_HOME_LOAD_TIMEOUT_MS = 60_000;

class MoneyHomeView {
  // Balance summary elements
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

  // Earnings elements
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

  // Onboarding elements
  get onboardingCardTitle(): EncapsulatedElementType {
    return Matchers.getElementByID(MoneyOnboardingCardTestIds.TITLE);
  }

  // Action elements
  get sendButton(): EncapsulatedElementType {
    return Matchers.getElementByID(MoneyActionButtonRowTestIds.TRANSFER_BUTTON);
  }

  // Readiness checks used during performance measurement
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

  async waitForApyLoaded(timeout = MONEY_HOME_LOAD_TIMEOUT_MS): Promise<void> {
    await Assertions.expectElementToExist(this.apy, {
      description: 'Money Home APY should be present',
      timeout,
    });
  }

  async waitForEarningsValuesLoaded(
    timeout = MONEY_HOME_LOAD_TIMEOUT_MS,
  ): Promise<void> {
    await Assertions.expectElementToExist(this.lifetimeEarningsValue, {
      description: 'Money Home Lifetime earnings value should be populated',
      timeout,
    });
    await Assertions.expectElementToExist(this.monthlyEarningsValue, {
      description: 'Money Home Monthly earnings value should be populated',
      timeout,
    });
  }

  // Post-load state assertions
  async expectEarningsSectionVisible(
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
    await Assertions.expectElementToExist(this.lifetimeEarningsLabel, {
      description: 'Money Home Lifetime earnings label should exist',
      timeout,
    });
  }

  async expectEarningsSectionNotVisible(
    timeout = MONEY_HOME_LOAD_TIMEOUT_MS,
  ): Promise<void> {
    await Assertions.expectElementToNotBeVisible(this.earnings, {
      description: 'Money Home Earnings section should not be visible',
      timeout,
    });
    await Assertions.expectElementToNotBeVisible(this.monthlyEarningsLabel, {
      description: 'Money Home Monthly earnings label should not be visible',
      timeout,
    });
    await Assertions.expectElementToNotBeVisible(this.lifetimeEarningsLabel, {
      description: 'Money Home Lifetime earnings label should not be visible',
      timeout,
    });
  }

  async expectOnboardingCardTitleVisible(
    timeout = MONEY_HOME_LOAD_TIMEOUT_MS,
  ): Promise<void> {
    await Assertions.expectElementToExist(this.onboardingCardTitle, {
      description: 'Money onboarding card title should be present',
      timeout,
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

  // Balance resolution helpers
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
