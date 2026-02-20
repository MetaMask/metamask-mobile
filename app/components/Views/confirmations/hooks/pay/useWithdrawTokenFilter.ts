import { useCallback } from 'react';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { isTransactionPayWithdraw } from '../../utils/transaction';
import { usePayPostQuoteConfig } from './usePayPostQuoteConfig';
import { filterTokensByAllowlist } from '../../utils/transaction-pay';
import { AssetType } from '../../types/token';

/**
 * Returns a token filter for withdraw transactions, following the same pattern
 * as `usePerpsBalanceTokenFilter` and `useMusdConversionTokens`.
 *
 * When the resolved post-quote config has a `tokens` allowlist, only tokens
 * matching the allowlist are returned. Otherwise all tokens pass through.
 */
export function useWithdrawTokenFilter(): (tokens: AssetType[]) => AssetType[] {
  const transactionMeta = useTransactionMetadataRequest();
  const config = usePayPostQuoteConfig();

  return useCallback(
    (tokens: AssetType[]): AssetType[] => {
      if (!isTransactionPayWithdraw(transactionMeta)) {
        return tokens;
      }

      if (!config.tokens) {
        return tokens;
      }

      return filterTokensByAllowlist(tokens, config.tokens);
    },
    [transactionMeta, config],
  );
}
