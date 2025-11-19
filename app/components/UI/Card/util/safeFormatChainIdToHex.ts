import { formatChainIdToHex } from '@metamask/bridge-controller';

export const safeFormatChainIdToHex = (chainId: string) => {
  try {
    return formatChainIdToHex(chainId);
  } catch {
    return chainId;
  }
};
