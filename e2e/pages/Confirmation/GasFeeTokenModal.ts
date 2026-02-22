import { Assertions, Gestures, Matchers } from '../../../tests/framework';

import { GasFeeTokenModalSelectorsText } from '../../../app/components/Views/confirmations/ConfirmationView.testIds';

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
    const amountElementLabel = this.elementSafe(amountElementAttributes);
    await Assertions.checkIfTextMatches(amountElementLabel, amount);
  }

  async checkBalance(symbol: string, balance: string): Promise<void> {
    const balanceElement = await Matchers.getElementByID(
      `${GasFeeTokenModalSelectorsText.GAS_FEE_TOKEN_BALANCE}-${symbol}`,
    );
    const balanceElementAttributes = await balanceElement.getAttributes();
    const balanceElementLabel = this.elementSafe(balanceElementAttributes);
    await Assertions.checkIfTextMatches(balanceElementLabel, balance);
  }

  async checkAmountFiat(symbol: string, amountFiat: string): Promise<void> {
    const amountFiatElement = await Matchers.getElementByID(
      `${GasFeeTokenModalSelectorsText.GAS_FEE_TOKEN_AMOUNT_FIAT}-${symbol}`,
    );

    await Assertions.expectElementToBeVisible(amountFiatElement, {
      description: `Amount fiat for ${symbol} is visible`,
    });

    const amountFiatElementAttributes = await amountFiatElement.getAttributes();
    const amountFiatElementLabel = this.elementSafe(
      amountFiatElementAttributes,
    );
    await Assertions.checkIfTextMatches(amountFiatElementLabel, amountFiat);
  }

  private elementSafe(elementAttributes: unknown): string {
    return (
      (elementAttributes as { text?: string; label?: string })?.text ??
      (elementAttributes as { text?: string; label?: string })?.label ??
      ''
    );
  }
}

export default new GasFeeTokenModal();
