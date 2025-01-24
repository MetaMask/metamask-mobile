import { StakeViewSelectors } from '../../selectors/Stake/StakeView.selectors.js'

import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures'

class StakeView {
  get stakeContainer() {
    return Matchers.getElementByText(StakeViewSelectors.STAKE_CONTAINER);
  }

  get unstakeContainer() {
    return Matchers.getElementByText(StakeViewSelectors.UNSTAKE_CONTAINER);
  }

  get reviewButton() {
    return Matchers.getElementByText(StakeViewSelectors.REVIEW_BUTTON);
  }

  get continueButton() {
    return Matchers.getElementByText(StakeViewSelectors.CONTINUE);
  }

  get swapButton() {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByID(SwapsViewSelectors.SWAP_BUTTON)
      : Matchers.getElementByLabel(SwapsViewSelectors.SWAP_BUTTON);
  }

  generateSwapCompleteLabel(sourceToken, destinationToken) {
    let title = SwapViewSelectorsTexts.SWAP_CONFIRMED;
    title = title.replace('{{sourceToken}}', sourceToken);
    title = title.replace('{{destinationToken}}', destinationToken);
    return title;
  }

  async selectAmount(amount) {
      const amountButton = await Matchers.getElementByText(amount);
      await Gestures.waitAndTap(amountButton)
  }

  async enterAmount(amount) {
    for (let idx = 0; idx < amount.length; idx++) {
      const element = Matchers.getElementByText(amount[idx]);
      await Gestures.waitAndTap(element);
    }
  }

  async tapReview() {
    await Gestures.waitAndTap(this.reviewButton);
  }

  async tapContinue() {
    await Gestures.waitAndTap(this.continueButton);
  }

}

export default new StakeView();
