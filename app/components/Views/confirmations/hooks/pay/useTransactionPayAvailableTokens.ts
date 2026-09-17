import { useMemo } from 'react';

import { useAccountTokens } from '../send/useAccountTokens';
import { getAvailableTokens } from '../../utils/transaction-pay';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { isTransactionPayWithdraw } from '../../utils/transaction';
import { useTransactionPayBlockedTokens } from './useTransactionPayBlockedTokens';

export function useTransactionPayAvailableTokens() {
  const tokens = useAccountTokens({ includeNoBalance: true });
  const transactionMeta = useTransactionMetadataRequest();
  const isPostQuote = isTransactionPayWithdraw(transactionMeta);
  const blockedTokens = useTransactionPayBlockedTokens();
  const paySource = transactionMeta?.metamaskPay?.source;

  const availableTokens = useMemo(
    () =>
      getAvailableTokens({
        tokens,
        blockedTokens,
        selectedAssetId: paySource?.sourceAccountId.startsWith('solana:')
          ? paySource.sourceAssetId
          : undefined,
      }),
    [tokens, blockedTokens, paySource],
  );

  // For post-quote transactions, tokens are always available
  // (the supported destination tokens from the bridge API).
  // Disabled tokens are excluded so the UI can correctly fall back to fiat
  // payment or BuySection when every token is blocked.
  const hasTokens = isPostQuote || availableTokens.some((t) => !t.disabled);

  return { availableTokens, hasTokens };
}
