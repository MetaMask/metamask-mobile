import { MoneyActionButtonRowTestIds } from '../../../app/components/UI/Money/components/MoneyActionButtonRow/MoneyActionButtonRow.testIds';
import { MoneyActivityListTestIds } from '../../../app/components/UI/Money/components/MoneyActivityList/MoneyActivityList.testIds';
import { MoneyBalanceSummaryTestIds } from '../../../app/components/UI/Money/components/MoneyBalanceSummary/MoneyBalanceSummary.testIds';
import { MoneyEarningsTestIds } from '../../../app/components/UI/Money/components/MoneyEarnings/MoneyEarnings.testIds';
import { MoneyOnboardingCardTestIds } from '../../../app/components/UI/Money/components/MoneyOnboardingCard/MoneyOnboardingCard.testIds';
import { MoneyHomeViewTestIds } from '../../../app/components/UI/Money/Views/MoneyHomeView/MoneyHomeView.testIds';
import Assertions from '../../framework/Assertions';
import { EncapsulatedElementType } from '../../framework/EncapsulatedElement';
import Gestures from '../../framework/Gestures';
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
  get addButton(): EncapsulatedElementType {
    return Matchers.getElementByID(MoneyActionButtonRowTestIds.ADD_BUTTON);
  }

  get sendButton(): EncapsulatedElementType {
    return Matchers.getElementByID(MoneyActionButtonRowTestIds.TRANSFER_BUTTON);
  }

  get transferButton(): EncapsulatedElementType {
    return Matchers.getElementByID(MoneyActionButtonRowTestIds.TRANSFER_BUTTON);
  }

  async expectMoneyHomeVisible(
    timeout = MONEY_HOME_LOAD_TIMEOUT_MS,
  ): Promise<void> {
    await Assertions.expectElementToBeVisible(this.addButton, {
      description: 'Money Home Add action should be visible',
      timeout,
    });
    await this.waitForMoneyAccountReady(timeout);
  }

  // The Money account is created asynchronously on Money screen focus. Either a
  // resolved balance or the balance-unavailable state proves the account now
  // exists, which is all the add/transfer sheets require to render.
  private async waitForMoneyAccountReady(timeout: number): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        const [hasBalance, isUnavailable] = await Promise.all([
          Utilities.isElementVisible(this.balance),
          Utilities.isElementVisible(this.unavailableBalance),
        ]);
        if (!hasBalance && !isUnavailable) {
          throw new Error('Money account not ready yet');
        }
      },
      {
        timeout,
        description: 'Money account should be created (balance resolved)',
      },
    );
  }

  async tapAdd(): Promise<void> {
    await Gestures.waitAndTap(this.addButton, {
      elemDescription: 'Money Home Add button',
    });
  }

  get scrollView(): EncapsulatedElementType {
    return Matchers.getElementByID(MoneyHomeViewTestIds.SCROLL_VIEW);
  }

  get activityList(): EncapsulatedElementType {
    return Matchers.getElementByID(MoneyActivityListTestIds.CONTAINER);
  }

  async scrollToActivitySection(): Promise<void> {
    await Gestures.scrollToElement(this.activityList, this.scrollView, {
      elemDescription: 'Money home activity section',
      direction: 'down',
    });
  }

  async verifyActivityItemLabelAndAmount(
    label: string,
    amount: string,
  ): Promise<void> {
    const labelElement = Matchers.getElementByText(label);
    await Assertions.expectElementToBeVisible(labelElement, {
      description: `Money home activity row "${label}" should be visible`,
      timeout: MONEY_HOME_LOAD_TIMEOUT_MS,
    });
    await Gestures.scrollIntoView(labelElement, { direction: 'down' });
    await Assertions.expectElementToBeVisible(
      Matchers.getElementByText(amount),
      {
        description: `Money home activity row amount "${amount}" should be visible`,
        timeout: MONEY_HOME_LOAD_TIMEOUT_MS,
      },
    );
  }

  async tapActivityItemByLabel(label: string): Promise<void> {
    const labelElement = Matchers.getElementByText(label);
    await Gestures.scrollIntoView(labelElement, { direction: 'down' });
    await Gestures.waitAndTap(labelElement, {
      elemDescription: `Money home activity item "${label}"`,
    });
  }

  async tapTransfer(): Promise<void> {
    await Gestures.waitAndTap(this.transferButton, {
      elemDescription: 'Money Home Transfer button',
    });
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

    return Utilities.getElementText(this.balance);
  }

  private async throwIfBalanceUnavailable(): Promise<void> {
    const [isUnavailable, hasNoAccount] = await Promise.all([
      Utilities.isElementVisible(this.unavailableBalance),
      Utilities.isElementVisible(this.noAccountBalance),
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
