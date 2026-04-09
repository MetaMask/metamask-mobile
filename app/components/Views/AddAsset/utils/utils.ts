import { Token, TrendingAsset } from '@metamask/assets-controllers';
import {
  CaipAssetType,
  CaipChainId,
  Hex,
  parseCaipAssetType,
} from '@metamask/utils';
import { getTrendingTokenImageUrl } from '../../../UI/Trending/utils/getTrendingTokenImageUrl';
import { formatChainIdToHex } from '@metamask/bridge-controller';
import { constants } from 'ethers';
import { isNonEvmChainId } from '../../../../core/Multichain/utils';

export type ImportAsset = Token & { chainId: Hex | CaipChainId };

export const convertTrendingAssetsToImporAssets = (
  apiTokens: TrendingAsset[],
): ImportAsset[] =>
  apiTokens.map((token) => {
    const assetId = token.assetId as CaipAssetType;
    const { assetReference, chainId, assetNamespace } =
      parseCaipAssetType(assetId);
    const isNonEvm = isNonEvmChainId(chainId);
    const isNative = assetNamespace === 'slip44';

    // For non-EVM chains, keep the full assetId as the address to properly match balances
    // For EVM native tokens, use the zero address (required by useLatestBalance)
    // For EVM ERC20 tokens, use the asset reference (the actual contract address)
    let address: string;
    if (isNonEvm) {
      address = token.assetId;
    } else if (isNative) {
      address = constants.AddressZero;
    } else {
      address = assetReference;
    }

    // For EVM chains, convert chainId to Hex format for useLatestBalance to work correctly
    // For non-EVM chains, keep CAIP format
    const formattedChainId = isNonEvm ? chainId : formatChainIdToHex(chainId);

    const { decimals, symbol, name, rwaData, ...remainingTokenProps } = token;
    return {
      ...remainingTokenProps,
      address,
      decimals,
      symbol,
      image: getTrendingTokenImageUrl(token.assetId),
      name,
      rwaData: token.rwaData,
      chainId: formattedChainId,
    };
  });
