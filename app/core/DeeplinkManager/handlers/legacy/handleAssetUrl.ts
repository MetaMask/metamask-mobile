import {
  CaipAssetType,
  CaipChainId,
  Hex,
  KnownCaipNamespace,
  isCaipAssetType,
  parseCaipAssetType,
} from '@metamask/utils';
import { formatChainIdToHex } from '@metamask/bridge-controller';
import { fetchAssetMetadata } from '../../../../components/UI/Bridge/hooks/useAssetMetadata/utils';
import { TokenI } from '../../../../components/UI/Tokens/types';
import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../NavigationService';
import DevLogger from '../../../SDKConnect/utils/DevLogger';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

interface HandleAssetUrlParams {
  assetPath: string;
}

const buildAssetNavigationParams = async ({
  assetId,
}: {
  assetId: CaipAssetType;
}): Promise<TokenI | null> => {
  try {
    const asset = parseCaipAssetType(assetId);
    const { chain, chainId } = asset;

    const metadata = await fetchAssetMetadata(assetId, chainId);
    if (!metadata) {
      DevLogger.log(
        '[handleAssetUrl] Token metadata not found for asset:',
        assetId,
      );
      return null;
    }

    const isEvmNamespace = chain.namespace === KnownCaipNamespace.Eip155;
    const isNative = asset.assetNamespace === 'slip44';

    const chainIdForNav = (): Hex | CaipChainId =>
      isEvmNamespace ? formatChainIdToHex(chain.reference) : chainId;

    const addressForNav = (): Hex | CaipAssetType => {
      if (isEvmNamespace && isNative) {
        return ZERO_ADDRESS;
      }

      if (isEvmNamespace && !isNative) {
        return asset.assetReference as Hex;
      }

      return assetId;
    };

    const token: TokenI = {
      address: addressForNav(),
      chainId: chainIdForNav(),
      symbol: metadata.symbol,
      name: metadata.name,
      decimals: metadata.decimals,
      rwaData: metadata.rwaData,
      image: metadata.image ?? '',
      logo: metadata.image ?? undefined,
      balance: '0',
      isNative,
      isETH: undefined,
    };

    return token;
  } catch {
    return null;
  }
};

const handleTokenDetailsNavigation = (token?: TokenI | null) => {
  if (!token) {
    NavigationService.navigation.navigate(Routes.WALLET.HOME);
    return;
  }

  NavigationService.navigation.navigate('Asset', token);
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

    const assetParams = await buildAssetNavigationParams({
      assetId,
    }).catch(() => null);

    handleTokenDetailsNavigation(assetParams);
  } catch (error) {
    DevLogger.log('[handleAssetUrl] Failed to handle asset deeplink:', error);
    handleTokenDetailsNavigation(null);
  }
};
