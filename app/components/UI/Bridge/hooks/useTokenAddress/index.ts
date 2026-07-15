import { BridgeToken } from '../../types';
import { normalizeTokenAddress } from '../../utils/tokenUtils';

export const useTokenAddress = (
  token: BridgeToken | undefined,
): string | undefined =>
  token ? normalizeTokenAddress(token.address, token.chainId) : undefined;
