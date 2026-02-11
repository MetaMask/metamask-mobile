import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import Utilities from '../../framework/Utilities';
import {
  PerpsMarketBalanceActionsSelectorsIDs,
  PerpsTabViewSelectorsIDs,
} from '../../../app/components/UI/Perps/Perps.testIds';

class PerpsTabView {
  get balanceButton(): DetoxElement {
    return Matchers.getElementByID(PerpsTabViewSelectorsIDs.BALANCE_BUTTON);
  }

  get addFundsButton(): DetoxElement {
    return Matchers.getElementByID(PerpsTabViewSelectorsIDs.ADD_FUNDS_BUTTON);
  }

  get withdrawButton(): DetoxElement {
    return Matchers.getElementByID(PerpsTabViewSelectorsIDs.WITHDRAW_BUTTON);
  }

  get onboardingButton(): DetoxElement {
    return Matchers.getElementByText('Start trading');
  }

  get startNewTradeButton(): DetoxElement {
    return Matchers.getElementByID(
      PerpsTabViewSelectorsIDs.START_NEW_TRADE_CTA,
    );
  }

  get balanceValue(): DetoxElement {
    return Matchers.getElementByID(PerpsTabViewSelectorsIDs.BALANCE_VALUE);
  }

  get marketBalanceValue(): DetoxElement {
    return Matchers.getElementByID(
      PerpsMarketBalanceActionsSelectorsIDs.BALANCE_VALUE,
    );
  }

  async tapBalanceButton(): Promise<void> {
    await Gestures.waitAndTap(this.balanceButton, {
      elemDescription: 'Perps Balance Button',
    });
  }

  async tapAddFundsButton(): Promise<void> {
    // Prefer new market add funds button; fallback to legacy id
    const useMarketButton = await Utilities.isElementVisible(
      this.marketAddFundsButton,
      1500,
    );
    const target = useMarketButton
      ? this.marketAddFundsButton
      : this.addFundsButton;
    await Gestures.waitAndTap(target, {
      elemDescription: 'Perps Add Funds Button',
    });
  }

  get marketAddFundsButton(): DetoxElement {
    return Matchers.getElementByID(
      PerpsMarketBalanceActionsSelectorsIDs.ADD_FUNDS_BUTTON,
    );
  }

  async tapWithdrawButton(): Promise<void> {
    await Gestures.waitAndTap(this.withdrawButton, {
      elemDescription: 'Perps Withdraw Button',
    });
  }

  async tapOnboardingButton(): Promise<void> {
    await Gestures.waitAndTap(this.onboardingButton, {
      elemDescription: 'Perps Onboarding Button',
    });
  }

  async tapStartNewTradeButton(): Promise<void> {
    await Gestures.waitAndTap(this.startNewTradeButton, {
      elemDescription: 'Perps Start New Trade Button',
    });
  }

  async getBalance(): Promise<number> {
    // Prefer explicit value elements; fallback to balance button for accessibility labels
    const isMarketValueVisible = await Utilities.isElementVisible(
      this.marketBalanceValue,
      1500,
    );
    const isLegacyValueVisible = await Utilities.isElementVisible(
      this.balanceValue,
      1000,
    );

    const targetElement: DetoxElement = isMarketValueVisible
      ? this.marketBalanceValue
      : isLegacyValueVisible
        ? this.balanceValue
        : this.balanceButton; // final fallback to button

    const attributes = await (
      (await targetElement) as IndexableNativeElement
    ).getAttributes();
    const balanceText =
      (attributes as { text?: string; label?: string; value?: string }).text ||
      (attributes as { text?: string; label?: string; value?: string }).label ||
      (attributes as { text?: string; label?: string; value?: string }).value ||
      '0';

    // Extract numeric value from balance text (remove currency symbols, commas, etc.)
    const numericValue = balanceText.replace(/[^0-9.-]/g, '');
    return parseFloat(numericValue) || 0;
  }
}

export default new PerpsTabView();
