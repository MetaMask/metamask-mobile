import { useSelector } from 'react-redux';
import { selectAssetsMemecoinTdpV1Enabled } from '../../../../selectors/featureFlagController/assetsMemecoinTdpV1';
import {
  TokenDetailsVariant,
  type TokenDetailsRouteParams,
} from '../constants/constants';
import { useIsMemeToken } from './useIsMemeToken';
import { useTokenCaipAssetId } from './useTokenCaipAssetId';

/**
 * Resolves which Token Details V1 variant applies to a token, or `null` when
 * none does and the legacy Token Details page should render instead.
 *
 * Each variant pairs its own remote feature flag with its own detection signal
 * so variants can roll out independently.
 */
export const useTokenDetailsVariant = (
  token: TokenDetailsRouteParams,
): TokenDetailsVariant | null => {
  const caipAssetId = useTokenCaipAssetId(token);

  const isMemecoinTdpEnabled = useSelector(selectAssetsMemecoinTdpV1Enabled);
  const { isMeme } = useIsMemeToken({
    assetId: caipAssetId,
    enabled: isMemecoinTdpEnabled,
  });

  if (isMemecoinTdpEnabled && isMeme) {
    return TokenDetailsVariant.Memecoin;
  }

  return null;
};
