import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import Assertions from '../../utils/Assertions';

const GasFeeTokenModalSelectorsText = {
  GAS_FEE_TOKEN_ITEM: 'gas-fee-token-list-item',
  GAS_FEE_TOKEN_AMOUNT: 'gas-fee-token-list-item-amount-token',
  GAS_FEE_TOKEN_BALANCE: 'gas-fee-token-list-item-balance',
  GAS_FEE_TOKEN_SYMBOL: 'gas-fee-token-list-item-symbol',
  GAS_FEE_TOKEN_AMOUNT_FIAT: 'gas-fee-token-list-item-amount-fiat',
};

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
