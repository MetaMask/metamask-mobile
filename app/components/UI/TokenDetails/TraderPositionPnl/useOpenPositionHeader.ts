import { useSelector } from 'react-redux';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../selectors/accountsController';
import type { TokenDetailsRouteParams } from '../constants/constants';
import { useTokenBalance } from '../hooks/useTokenBalance';
import { useTokenCaipAssetId } from '../hooks/useTokenCaipAssetId';
import {
  toOpenPositionHeader,
  type OpenPositionHeaderModel,
} from './openPositionHeader';
import { useOpenPositionForAsset } from './useOpenPositionForAsset';
import { useUsdToFiatRate } from './useUsdToFiatRate';

/**
 * Header model for the meme-page sticky footer.
 * The selected account address is the wallet, and the token's CAIP-19 id is the asset.
 */
export const useOpenPositionHeader = (
  token: TokenDetailsRouteParams,
): OpenPositionHeaderModel => {
  const address = useSelector(selectSelectedInternalAccountFormattedAddress);
  const assetId = useTokenCaipAssetId(token);
  const { position, isLoading } = useOpenPositionForAsset(
    address,
    assetId ?? undefined,
  );
  const { fiatBalance } = useTokenBalance(token);
  const conversion = useUsdToFiatRate();

  return toOpenPositionHeader({
    position,
    isLoading,
    walletFiatBalance: fiatBalance,
    conversion,
  });
};
