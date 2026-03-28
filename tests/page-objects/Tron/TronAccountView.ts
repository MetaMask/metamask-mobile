import Matchers from '../../framework/utils/Matchers';
import Assertions from '../../framework/utils/Assertions';

class TronAccountView {
  async checkBalanceIsDisplayed(expectedBalance: string) {
    const balanceElement = Matchers.getElementByText(expectedBalance);
    await Assertions.expectElementToBeVisible(
      balanceElement,
      `Tron balance should display: ${expectedBalance}`,
    );
  }

  async checkUsdBalanceIsDisplayed(expectedUsd: string) {
    const usdElement = Matchers.getElementByText(expectedUsd);
    await Assertions.expectElementToBeVisible(
      usdElement,
      `Tron USD balance should display: ${expectedUsd}`,
    );
  }
}

export default new TronAccountView();
