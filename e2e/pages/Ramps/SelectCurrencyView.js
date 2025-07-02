import Matchers from '../../framework/Matchers.ts';
import Gestures from '../../framework/Gestures.ts';


class SelectCurrencyView {
  async tapCurrencyOption(currency) {
    const currencyOption = Matchers.getElementByText(currency);
    await Gestures.waitAndTap(currencyOption);
  }
}

export default new SelectCurrencyView();
