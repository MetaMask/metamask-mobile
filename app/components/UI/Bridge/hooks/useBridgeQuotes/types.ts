import { BigNumber as EthersBigNumber } from 'ethers';

import type { BridgeToken } from '../../types';

export interface UseBridgeQuotesParams {
  latestSourceAtomicBalance?: EthersBigNumber;
  quoteParams: {
    srcAmount?: string;
    srcToken?: BridgeToken;
    destToken?: BridgeToken;
    walletAddress?: string;
    destWalletAddress?: string;
    slippage?: string;
  };
}
