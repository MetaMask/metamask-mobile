import Matchers from '../../../tests/framework/Matchers';
import Gestures from '../../../tests/framework/Gestures';

class SelectCurrencyView {
  async tapCurrencyOption(currency: string): Promise<void> {
    const currencyOption = Matchers.getElementByText(currency);
    await Gestures.waitAndTap(currencyOption, {
      elemDescription: `Currency "${currency}" in Select Currency View`,
    });
  }
}

export default new SelectCurrencyView();
