import { BRIDGE_PROD_API_BASE_URL, BridgeClientId, fetchBridgeTokens } from '@metamask/bridge-controller';
import { useAsyncResult } from '../../../hooks/useAsyncResult';
import { Hex } from '@metamask/utils';
import { handleFetch } from '@metamask/controller-utils';

export const useTopTokens = ({ chainId }: { chainId?: Hex }) => {
  const { value, pending } = useAsyncResult(async () => {
    if (!chainId) {
      return {};
    }

    const tokens = await fetchBridgeTokens(
      chainId,
      BridgeClientId.MOBILE,
      handleFetch,
      BRIDGE_PROD_API_BASE_URL,
    );
    return tokens;
  }, [chainId]);

  return { topTokens: value, pending };
};
