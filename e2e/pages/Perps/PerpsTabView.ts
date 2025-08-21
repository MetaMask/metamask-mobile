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
}

export default new PerpsTabView();
