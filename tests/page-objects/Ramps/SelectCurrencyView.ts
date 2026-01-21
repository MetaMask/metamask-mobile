import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';

class SelectCurrencyView {
  async tapCurrencyOption(currency: string): Promise<void> {
    const currencyOption = Matchers.getElementByText(currency);
    await Gestures.waitAndTap(currencyOption, {
      elemDescription: `Currency "${currency}" in Select Currency View`,
    });
  }
}

export default new SelectCurrencyView();
