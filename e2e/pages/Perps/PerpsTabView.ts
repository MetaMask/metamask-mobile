import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';

class PerpsTabView {
  get balanceButton(): DetoxElement {
    return Matchers.getElementByID('perps-balance-button');
  }

  get addFundsButton(): DetoxElement {
    return Matchers.getElementByID('perps-add-funds-button');
  }

  get withdrawButton(): DetoxElement {
    return Matchers.getElementByID('perps-withdraw-button');
  }

  get onboardingButton(): DetoxElement {
    return Matchers.getElementByID('perps-onboarding-button');
  }

  get balanceValue(): DetoxElement {
    return Matchers.getElementByID('perps-balance-value');
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
