import Matchers from '../../framework/Matchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class SelectCurrencyView {
  async tapCurrencyOption(currency: string): Promise<void> {
    const currencyOption = Matchers.getElementByText(currency);
    await UnifiedGestures.waitAndTap(currencyOption, {
      elemDescription: `Currency "${currency}" in Select Currency View`,
    });
  }
}

export default new SelectCurrencyView();
