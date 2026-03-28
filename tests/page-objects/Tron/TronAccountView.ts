import Matchers from '../../framework/Matchers';
import Assertions from '../../framework/Assertions';
import Gestures from '../../framework/Gestures';

const TOKEN_SWAP_BUTTON = 'token-swap-button';

class TronAccountView {
  get swapButton() {
    return Matchers.getElementByID(TOKEN_SWAP_BUTTON);
  }

  async checkBalanceIsDisplayed(expectedBalance: string) {
    const balanceElement = Matchers.getElementByText(expectedBalance);
    await Assertions.expectElementToBeVisible(
      balanceElement,
      `Tron balance should display: ${expectedBalance}`,
    );
  }

  async tapSwapButton() {
    await Gestures.tap(this.swapButton);
  }
}

export default new TronAccountView();
