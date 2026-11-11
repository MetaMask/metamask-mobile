import { useMemo } from 'react';

import { useAccountTokens } from '../send/useAccountTokens';
import {
  getAvailableTokens,
  isSolanaPayAsset,
} from '../../utils/transaction-pay';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { isTransactionPayWithdraw } from '../../utils/transaction';
import { useTransactionPayBlockedTokens } from './useTransactionPayBlockedTokens';
import { useTransactionPayToken } from './useTransactionPayToken';
import { useIsSolanaPaySourceEnabled } from './useIsSolanaPaySourceEnabled';

export function useTransactionPayAvailableTokens() {
  const tokens = useAccountTokens({ includeNoBalance: true });
  const transactionMeta = useTransactionMetadataRequest();
  const isPostQuote = isTransactionPayWithdraw(transactionMeta);
  const blockedTokens = useTransactionPayBlockedTokens();
  const { nonEvmPayToken } = useTransactionPayToken();
  const isSolanaPayEnabled = useIsSolanaPaySourceEnabled();

  const availableTokens = useMemo(
    () =>
      getAvailableTokens({
        // Only the non-EVM selection is passed so an already selected Solana
        // source stays listed after a rollback; EVM output is unchanged.
        payToken: nonEvmPayToken,
        tokens,
        blockedTokens,
        isSolanaPayEnabled,
      }),
    [tokens, blockedTokens, isSolanaPayEnabled, nonEvmPayToken],
  );

  // For post-quote transactions, tokens are always available
  // (the supported destination tokens from the bridge API).
  // Disabled tokens are excluded so the UI can correctly fall back to fiat
  // payment or BuySection when every token is blocked.
  // Solana sources are only ever chosen explicitly, so they do not count as
  // tokens that automatic selection or the empty states can rely on.
  const hasTokens =
    isPostQuote ||
    availableTokens.some((t) => !t.disabled && !isSolanaPayAsset(t));

  return { availableTokens, hasTokens };
}
