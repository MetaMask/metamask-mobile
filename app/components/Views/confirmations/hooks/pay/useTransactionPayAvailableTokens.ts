import { useMemo } from 'react';

import { useAccountTokens } from '../send/useAccountTokens';
import { getAvailableTokens } from '../../utils/transaction-pay';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { isTransactionPayWithdraw } from '../../utils/transaction';
import { useTransactionPayBlockedTokens } from './useTransactionPayBlockedTokens';

export function useTransactionPayAvailableTokens() {
  const transactionMeta = useTransactionMetadataRequest();
  
  // For single-chain transactions (like mUSD conversion), only fetch tokens for that chain
  // This significantly improves performance by avoiding processing tokens on irrelevant chains
  const chainIds = transactionMeta?.chainId ? [transactionMeta.chainId] : undefined;
  
  const tokens = useAccountTokens({ 
    includeNoBalance: true,
    chainIds,
  });
  const isPostQuote = isTransactionPayWithdraw(transactionMeta);
  const blockedTokens = useTransactionPayBlockedTokens();

  const availableTokens = useMemo(
    () =>
      getAvailableTokens({
        tokens,
        blockedTokens,
      }),
    [tokens, blockedTokens],
  );

  // For post-quote transactions, tokens are always available
  // (the supported destination tokens from the bridge API)
  const hasTokens = isPostQuote || availableTokens.length > 0;

  return { availableTokens, hasTokens };
}
