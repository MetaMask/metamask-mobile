import { TransactionPayComponentIDs } from '../../../app/components/Views/confirmations/ConfirmationView.testIds';
import { getAssetTestId } from '../../selectors/Wallet/WalletView.selectors';
import {
  FrameworkDetector,
  Matchers,
  PlaywrightMatchers,
  UnifiedGestures,
  encapsulated,
  type EncapsulatedElementType,
} from '../../framework';

/**
 * Page object for the secondary all-assets token picker opened from the pay-with
 * bottom sheet "Other assets" row. Rows expose both a symbol-only testID
 * (`asset-<SYMBOL>`) and a chain-qualified one (`asset-<CHAINID>-<SYMBOL>`); use
 * tapAssetOnNetwork to disambiguate a symbol that appears on multiple chains, or
 * tapAsset with an index for symbol-only selection.
 */
class PayWithModalTokenPicker {
  get tokenListScrollViewIdentifier(): Promise<Detox.NativeMatcher> {
    return Matchers.getIdentifier(
      TransactionPayComponentIDs.PAY_WITH_TOKEN_LIST,
    );
  }

  getAssetRow(symbol: string, index = 0): EncapsulatedElementType {
    const testID = getAssetTestId(symbol);
    return encapsulated({
      detox: () => Matchers.getElementByID(testID, index),
      appium: () => PlaywrightMatchers.getElementById(testID, { exact: true }),
    });
  }

  getAssetRowOnNetwork(
    symbol: string,
    chainId: string,
  ): EncapsulatedElementType {
    const testID = getAssetTestId(`${chainId}-${symbol}`);
    return encapsulated({
      detox: () => Matchers.getElementByID(testID),
      appium: () => PlaywrightMatchers.getElementById(testID, { exact: true }),
    });
  }

  async tapAsset(symbol: string, index = 0): Promise<void> {
    const assetRow = this.getAssetRow(symbol, index);
    const opts = { description: `Pay with asset ${symbol}` };

    if (FrameworkDetector.isDetox()) {
      await UnifiedGestures.scrollToElement(
        assetRow,
        this.tokenListScrollViewIdentifier,
        { ...opts, direction: 'down', scrollAmount: 200 },
      );
    }
    await UnifiedGestures.waitAndTap(assetRow, opts);
  }

  /**
   * Taps an asset row by specifically targeting its chainId.
   */
  async tapAssetOnNetwork(symbol: string, chainId: string): Promise<void> {
    const assetRow = this.getAssetRowOnNetwork(symbol, chainId);
    const opts = {
      description: `Pay with asset ${symbol} on network ${chainId}`,
    };

    if (FrameworkDetector.isDetox()) {
      await UnifiedGestures.scrollToElement(
        assetRow,
        this.tokenListScrollViewIdentifier,
        { ...opts, direction: 'down', scrollAmount: 200 },
      );
    }
    await UnifiedGestures.waitAndTap(assetRow, opts);
  }
}

export default new PayWithModalTokenPicker();
