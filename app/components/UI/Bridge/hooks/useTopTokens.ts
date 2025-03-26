import { BRIDGE_PROD_API_BASE_URL, BridgeClientId, fetchBridgeTokens, formatChainIdToHex } from '@metamask/bridge-controller';
import { useAsyncResult } from '../../../hooks/useAsyncResult';
import { Hex } from '@metamask/utils';
import { handleFetch } from '@metamask/controller-utils';
import { BridgeToken } from '../types';
interface UseTopTokensProps {
  chainId?: Hex;
}

export const useTopTokens = ({ chainId }: UseTopTokensProps): { topTokens: BridgeToken[] | undefined, pending: boolean } => {
  const { value, pending } = useAsyncResult(async () => {
    if (!chainId) {
      return [];
    }

    const rawTokens = await fetchBridgeTokens(
      chainId,
      BridgeClientId.MOBILE,
      handleFetch,
      BRIDGE_PROD_API_BASE_URL,
    );

    const tokens = Object.values(rawTokens ?? {})
      .map((token) => ({
        address: token.address,
        symbol: token.symbol,
        name: token.name,
        image: token.iconUrl || token.icon,
        decimals: token.decimals,
        chainId: formatChainIdToHex(token.chainId), // TODO handle solana properly
      }));

    return tokens;
  }, [chainId]);

  return { topTokens: value, pending };
};
