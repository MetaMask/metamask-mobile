import {
  Assertions,
  Gestures,
  Matchers,
  type AppiumElement,
  Utilities,
} from '../../framework';

import { GasFeeTokenModalSelectorsText } from '../../../app/components/Views/confirmations/ConfirmationView.testIds';

class GasFeeTokenModal {
  getTokenItem(symbol: string): Promise<AppiumElement> {
    return Matchers.getElementByID(
      `${GasFeeTokenModalSelectorsText.GAS_FEE_TOKEN_ITEM}-${symbol}`,
    );
  }

  async tapToken(symbol: string): Promise<void> {
    await Gestures.waitAndTap(this.getTokenItem(symbol), {
      elemDescription: `Use gas fee token ${symbol}`,
    });
  }

  async checkAmountToken(symbol: string, amount: string): Promise<void> {
    const amountText = await Utilities.getElementText(
      Matchers.getElementByID(
        `${GasFeeTokenModalSelectorsText.GAS_FEE_TOKEN_AMOUNT}-${symbol}`,
      ),
    );
    await Assertions.checkIfTextMatches(amountText, amount);
  }

  async checkBalance(symbol: string, balance: string): Promise<void> {
    const balanceText = await Utilities.getElementText(
      Matchers.getElementByID(
        `${GasFeeTokenModalSelectorsText.GAS_FEE_TOKEN_BALANCE}-${symbol}`,
      ),
    );
    await Assertions.checkIfTextMatches(balanceText, balance);
  }

  async checkAmountFiat(symbol: string, amountFiat: string): Promise<void> {
    const amountFiatElement = Matchers.getElementByID(
      `${GasFeeTokenModalSelectorsText.GAS_FEE_TOKEN_AMOUNT_FIAT}-${symbol}`,
    );

    await Assertions.expectElementToBeVisible(amountFiatElement, {
      description: `Amount fiat for ${symbol} is visible`,
    });

    const amountFiatText = await Utilities.getElementText(amountFiatElement);
    await Assertions.checkIfTextMatches(amountFiatText, amountFiat);
  }
}

export default new GasFeeTokenModal();
