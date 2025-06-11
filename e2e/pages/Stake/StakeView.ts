import { StakeViewSelectors } from '../../selectors/Stake/StakeView.selectors.js';

import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class StakeView {
  get stakeContainer(): Promise<Detox.NativeElement> {
    return Matchers.getElementByText(StakeViewSelectors.STAKE_CONTAINER);
  }

  get unstakeContainer(): Promise<Detox.NativeElement> {
    return Matchers.getElementByText(StakeViewSelectors.UNSTAKE_CONTAINER);
  }

  get reviewButton(): Promise<Detox.NativeElement> {
    return Matchers.getElementByText(StakeViewSelectors.REVIEW_BUTTON);
  }

  get continueButton(): Promise<Detox.NativeElement> {
    return Matchers.getElementByText(StakeViewSelectors.CONTINUE);
  }

  async selectAmount(amount: string): Promise<void> {
    const amountButton = await Matchers.getElementByText(amount);
    await Gestures.waitAndTap(amountButton);
  }

  async enterAmount(amount: string): Promise<void> {
    for (let idx = 0; idx < amount.length; idx++) {
      const element = Matchers.getElementByText(amount[idx]);
      await Gestures.waitAndTap(element);
    }
  }

  async tapReview(): Promise<void> {
    await Gestures.waitAndTap(this.reviewButton);
  }

  async tapContinue(): Promise<void> {
    await Gestures.waitAndTap(this.continueButton);
  }
}

export default new StakeView();
