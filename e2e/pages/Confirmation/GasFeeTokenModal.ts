import { Assertions, Gestures, Matchers } from '../../framework';

import { GasFeeTokenModalSelectorsText } from '../../selectors/Confirmation/ConfirmationView.selectors';

class GasFeeTokenModal {
  getTokenItem(symbol: string): DetoxElement {
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
    const amountElement = await Matchers.getElementByID(
      `${GasFeeTokenModalSelectorsText.GAS_FEE_TOKEN_AMOUNT}-${symbol}`,
    );
    const amountElementAttributes = await amountElement.getAttributes();
    const amountElementLabel = (amountElementAttributes as { label: string })
      .label;
    await Assertions.checkIfTextMatches(amountElementLabel, amount);
  }

  async checkBalance(symbol: string, balance: string): Promise<void> {
    const balanceElement = await Matchers.getElementByID(
      `${GasFeeTokenModalSelectorsText.GAS_FEE_TOKEN_BALANCE}-${symbol}`,
    );
    const balanceElementAttributes = await balanceElement.getAttributes();
    const balanceElementLabel = (balanceElementAttributes as { label: string })
      .label;
    await Assertions.checkIfTextMatches(balanceElementLabel, balance);
  }

  async checkAmountFiat(symbol: string, amountFiat: string): Promise<void> {
    const amountFiatElement = await Matchers.getElementByID(
      `${GasFeeTokenModalSelectorsText.GAS_FEE_TOKEN_AMOUNT_FIAT}-${symbol}`,
    );
    const amountFiatElementAttributes = await amountFiatElement.getAttributes();
    const amountFiatElementLabel = (
      amountFiatElementAttributes as { label: string }
    ).label;
    await Assertions.checkIfTextMatches(amountFiatElementLabel, amountFiat);
  }
}

export default new GasFeeTokenModal();
