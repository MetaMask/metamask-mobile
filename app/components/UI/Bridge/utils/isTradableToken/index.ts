import { CaipChainId, TrxScope } from '@metamask/keyring-api';
import { BridgeToken } from '../../types';
import { Hex } from '@metamask/utils';

const nonTradableTokenNames: Record<Hex | CaipChainId, string[]> = {
  [TrxScope.Mainnet]: [
    'energy',
    'bandwidth',
    'max bandwidth',
    'staked for energy',
    'staked for bandwidth',
    'max energy',
  ],
};

export const isTradableToken = (token: BridgeToken) => {
  const isNonTradableToken = nonTradableTokenNames[token.chainId]?.includes(
    token.name?.toLowerCase() ?? '',
  );
  return !isNonTradableToken;
};
