import Matchers from '../../framework/Matchers';
import { EncapsulatedElementType } from '../../framework';

/** Linea USDC item id from AssetSelectionBottomSheet displaySymbol + caipChainId. */
export const LINEA_USDC_ASSET_ITEM_ID = 'asset-select-item-USDC-eip155:59144';

class AssetSelectionView {
  get lineaUsdcItem(): EncapsulatedElementType {
    return Matchers.getElementByID(LINEA_USDC_ASSET_ITEM_ID);
  }

  assetItem(
    displaySymbol: string,
    caipChainId: string,
  ): EncapsulatedElementType {
    return Matchers.getElementByID(
      `asset-select-item-${displaySymbol}-${caipChainId}`,
    );
  }
}

export default new AssetSelectionView();
