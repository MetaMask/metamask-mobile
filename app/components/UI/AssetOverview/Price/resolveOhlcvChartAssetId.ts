import { formatAddressToAssetId } from '@metamask/bridge-controller';
import { isCaipAssetType, type Hex } from '@metamask/utils';
import { normalizeTokenAddress } from '../../Bridge/utils/tokenUtils';

export interface OhlcvChartAssetIdParams {
  caipAssetId?: string;
  address?: string;
  chainId?: string;
}

export const resolveOhlcvChartAssetId = ({
  caipAssetId,
  address,
  chainId,
}: OhlcvChartAssetIdParams): string => {
  if (caipAssetId && isCaipAssetType(caipAssetId)) {
    return caipAssetId;
  }
  if (!address || !chainId) {
    return '';
  }

  try {
    return (
      formatAddressToAssetId(
        normalizeTokenAddress(address, chainId as Hex),
        chainId as Hex,
      ) ?? ''
    );
  } catch {
    return '';
  }
};
