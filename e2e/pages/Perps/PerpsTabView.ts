import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import { PerpsTabViewSelectorsIDs } from '../../selectors/Perps/Perps.selectors';

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
    // The onboarding button no longer exposes a testID; select by visible text
    return Matchers.getElementByText('Start trading');
  }

  get balanceValue(): DetoxElement {
    return Matchers.getElementByID(PerpsTabViewSelectorsIDs.BALANCE_VALUE);
  }

  async tapBalanceButton(): Promise<void> {
    await Gestures.waitAndTap(this.balanceButton, {
      elemDescription: 'Perps Balance Button',
    });
  }

  async tapAddFundsButton(): Promise<void> {
    await Gestures.waitAndTap(this.addFundsButton, {
      elemDescription: 'Perps Add Funds Button',
    });
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

  async getBalance(): Promise<number> {
    const balanceElement = await this.balanceValue;
    const attributes = await (
      balanceElement as IndexableNativeElement
    ).getAttributes();
    const balanceText =
      (attributes as { text: string; label: string }).text ||
      (attributes as { text: string; label: string }).label ||
      '0';

    // Extract numeric value from balance text (remove currency symbols, commas, etc.)
    const numericValue = balanceText.replace(/[^0-9.-]/g, '');
    return parseFloat(numericValue) || 0;
  }
}

export default new PerpsTabView();
