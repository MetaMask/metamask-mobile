import { useMemo } from 'react';
import type { MetamaskPaySource } from '@metamask/transaction-controller';
import { useSelector } from 'react-redux';

import { useAccountTokens } from '../send/useAccountTokens';
import { getAvailableTokens } from '../../utils/transaction-pay';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { isTransactionPayWithdraw } from '../../utils/transaction';
import { useTransactionPayBlockedTokens } from './useTransactionPayBlockedTokens';
import { selectSolanaPayEnabled } from '../../../../../selectors/featureFlagController/confirmations';
import type { AssetType } from '../../types/token';

export function filterSolanaPayTokens(
  tokens: AssetType[],
  isSolanaPayEnabled: boolean,
  paySource: MetamaskPaySource | undefined,
): AssetType[] {
  return tokens.filter((token) => {
    if (!token.chainId?.startsWith('solana:') || isSolanaPayEnabled) {
      return true;
    }

    return (
      paySource?.sourceAccountId.startsWith('solana:') === true &&
      (token.assetId ?? token.address) === paySource.sourceAssetId
    );
  });
}

export function useTransactionPayAvailableTokens() {
  const tokens = useAccountTokens({ includeNoBalance: true });
  const transactionMeta = useTransactionMetadataRequest();
  const isPostQuote = isTransactionPayWithdraw(transactionMeta);
  const blockedTokens = useTransactionPayBlockedTokens();
  const isSolanaPayEnabled = useSelector(selectSolanaPayEnabled);
  const paySource = transactionMeta?.metamaskPay?.source;

  const availableTokens = useMemo(
    () =>
      getAvailableTokens({
        tokens: filterSolanaPayTokens(tokens, isSolanaPayEnabled, paySource),
        blockedTokens,
        selectedAssetId: paySource?.sourceAccountId.startsWith('solana:')
          ? paySource.sourceAssetId
          : undefined,
      }),
    [tokens, blockedTokens, isSolanaPayEnabled, paySource],
  );

  // For post-quote transactions, tokens are always available
  // (the supported destination tokens from the bridge API).
  // Disabled tokens are excluded so the UI can correctly fall back to fiat
  // payment or BuySection when every token is blocked.
  const hasTokens = isPostQuote || availableTokens.some((t) => !t.disabled);

  return { availableTokens, hasTokens };
}
