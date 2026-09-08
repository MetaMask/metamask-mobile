import { TransactionPayComponentIDs } from '../../../app/components/Views/confirmations/ConfirmationView.testIds';
import { getAssetTestId } from '../../selectors/Wallet/WalletView.selectors';
import {
  Gestures,
  Matchers,
  type AppiumElement,
  type ScrollContainer,
} from '../../framework';

/**
 * Page object for the secondary all-assets token picker opened from the pay-with
 * bottom sheet "Other assets" row. Rows expose both a symbol-only testID
 * (`asset-<SYMBOL>`) and a chain-qualified one (`asset-<CHAINID>-<SYMBOL>`); use
 * tapAssetOnNetwork to disambiguate a symbol that appears on multiple chains, or
 * tapAsset with an index for symbol-only selection.
 */
class PayWithModalTokenPicker {
  get tokenListScrollViewIdentifier(): ScrollContainer {
    return Matchers.scrollContainer(
      TransactionPayComponentIDs.PAY_WITH_TOKEN_LIST,
    );
  }

  getAssetRow(symbol: string, index = 0): Promise<AppiumElement> {
    return Matchers.getElementByID(getAssetTestId(symbol), index);
  }

  getAssetRowOnNetwork(
    symbol: string,
    chainId: string,
  ): Promise<AppiumElement> {
    return Matchers.getElementByID(getAssetTestId(`${chainId}-${symbol}`));
  }

  async tapAsset(symbol: string, index = 0): Promise<void> {
    const assetRow = this.getAssetRow(symbol, index);
    await Gestures.scrollToElement(
      assetRow,
      this.tokenListScrollViewIdentifier,
      {
        elemDescription: `Pay with asset ${symbol}`,
        direction: 'down',
        scrollAmount: 200,
      },
    );
    await Gestures.waitAndTap(assetRow, {
      elemDescription: `Pay with asset ${symbol}`,
    });
  }

  async tapAssetOnNetwork(symbol: string, chainId: string): Promise<void> {
    const assetRow = this.getAssetRowOnNetwork(symbol, chainId);
    await Gestures.scrollToElement(
      assetRow,
      this.tokenListScrollViewIdentifier,
      {
        elemDescription: `Pay with asset ${symbol} on network ${chainId}`,
        direction: 'down',
        scrollAmount: 200,
      },
    );
    await Gestures.waitAndTap(assetRow, {
      elemDescription: `Pay with asset ${symbol} on network ${chainId}`,
    });
  }
}

export default new PayWithModalTokenPicker();
