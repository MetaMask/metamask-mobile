import { handleFetch } from '@metamask/controller-utils';
import {
  CaipAssetType,
  CaipChainId,
  Hex,
  isCaipAssetType,
  parseCaipAssetType,
  parseCaipChainId,
} from '@metamask/utils';
import {
  formatChainIdToHex,
  isNonEvmChainId,
} from '@metamask/bridge-controller';
import { getAssetImageUrl } from '../../../../components/UI/Bridge/hooks/useAssetMetadata/utils';
import { TokenI } from '../../../../components/UI/Tokens/types';
import { NATIVE_SWAPS_TOKEN_ADDRESS } from '../../../../constants/bridge';
import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../NavigationService';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import Logger from '../../../../util/Logger';

const TOKEN_API_V3_BASE_URL = 'https://tokens.api.cx.metamask.io/v3';

interface HandleAssetUrlParams {
  assetPath: string;
}

interface AssetMetadata {
  assetId: string;
  symbol: string;
  name: string;
  decimals: number;
}

const fetchAssetMetadataByAssetId = async (
  assetId: CaipAssetType,
): Promise<AssetMetadata | null> => {
  try {
    const url = `${TOKEN_API_V3_BASE_URL}/assets?assetIds=${assetId}`;
    const [assetMetadata]: AssetMetadata[] = await handleFetch(url);
    return assetMetadata ?? null;
  } catch (error) {
    return null;
  }
};

const buildAssetNavigationParams = ({
  assetId,
  chainId,
  assetNamespace,
  assetReference,
  metadata,
}: {
  assetId: CaipAssetType;
  chainId: CaipChainId;
  assetNamespace: string;
  assetReference: string;
  metadata: AssetMetadata;
}): TokenI => {
  const isNonEvmChain = isNonEvmChainId(chainId);
  const isNative = assetNamespace === 'slip44';
  const chainIdForNav: Hex | CaipChainId = isNonEvmChain
    ? chainId
    : formatChainIdToHex(parseCaipChainId(chainId).reference);
  const addressForNav = isNonEvmChain
    ? assetId
    : isNative
      ? NATIVE_SWAPS_TOKEN_ADDRESS
      : assetReference;
  const image = getAssetImageUrl(assetId, chainId) ?? '';
  const isEth = isNative && chainIdForNav === '0x1';

  return {
    address: addressForNav,
    chainId: chainIdForNav,
    symbol: metadata.symbol,
    name: metadata.name,
    decimals: metadata.decimals,
    image,
    logo: image || undefined,
    balance: '0',
    isNative,
    isETH: isEth,
    ticker: metadata.symbol,
  };
};

/**
 * Asset deeplink handler
 *
 * Supported URL formats:
 * - https://link.metamask.io/asset?asset=eip155:1/erc20:0x...
 * - https://link.metamask.io/asset?asset=eip155:1/slip44:60
 * - https://link.metamask.io/asset?assetId=eip155:1/erc20:0x...
 */
export const handleAssetUrl = async ({ assetPath }: HandleAssetUrlParams) => {
  DevLogger.log(
    '[handleAssetUrl] Starting asset deeplink handling with path:',
    assetPath,
  );

  try {
    const urlParams = new URLSearchParams(
      assetPath.includes('?') ? assetPath.split('?')[1] : '',
    );
    const assetParam = urlParams.get('asset') ?? urlParams.get('assetId');

    if (!assetParam) {
      DevLogger.log('[handleAssetUrl] Missing asset parameter');
      return;
    }

    if (!isCaipAssetType(assetParam as CaipAssetType)) {
      DevLogger.log(
        '[handleAssetUrl] Invalid CAIP-19 asset parameter:',
        assetParam,
      );
      return;
    }

    const assetId = assetParam as CaipAssetType;
    const parsedAsset = parseCaipAssetType(assetId);
    const chainId = parsedAsset.chainId as CaipChainId;

    const metadata = await fetchAssetMetadataByAssetId(assetId);
    if (!metadata) {
      DevLogger.log(
        '[handleAssetUrl] Token metadata not found for asset:',
        assetId,
      );
      return;
    }

    const assetParams = buildAssetNavigationParams({
      assetId,
      chainId,
      assetNamespace: parsedAsset.assetNamespace,
      assetReference: parsedAsset.assetReference,
      metadata,
    });

    NavigationService.navigation.navigate('Asset', assetParams);
  } catch (error) {
    DevLogger.log('[handleAssetUrl] Failed to handle asset deeplink:', error);
    Logger.error(
      error as Error,
      '[handleAssetUrl] Error handling asset deeplink',
    );

    try {
      NavigationService.navigation.navigate(Routes.WALLET.HOME);
    } catch (navError) {
      Logger.error(
        navError as Error,
        '[handleAssetUrl] Failed to navigate to fallback screen',
      );
    }
  }
};
