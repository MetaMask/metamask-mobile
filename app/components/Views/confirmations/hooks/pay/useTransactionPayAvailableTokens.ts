import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useAccountTokens } from '../send/useAccountTokens';
import { getAvailableTokens } from '../../utils/transaction-pay';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { isTransactionPayWithdraw } from '../../utils/transaction';
import {
  selectMetaMaskPayTokensFlags,
  getBlockedTokensForTransactionType,
} from '../../../../../selectors/featureFlagController/confirmations';

export function useTransactionPayAvailableTokens() {
  const tokens = useAccountTokens({ includeNoBalance: true });
  const transactionMeta = useTransactionMetadataRequest();
  const isPostQuote = isTransactionPayWithdraw(transactionMeta);
  const payTokensFlags = useSelector(selectMetaMaskPayTokensFlags);

  const blockedTokensList = useMemo(
    () =>
      getBlockedTokensForTransactionType(
        payTokensFlags.blockedTokens,
        transactionMeta?.type,
      ),
    [payTokensFlags.blockedTokens, transactionMeta?.type],
  );

  const availableTokens = useMemo(
    () =>
      getAvailableTokens({
        tokens,
        blockedTokens: blockedTokensList,
      }),
    [tokens, blockedTokensList],
  );

  // For post-quote transactions, tokens are always available
  // (the supported destination tokens from the bridge API)
  const hasTokens = isPostQuote || availableTokens.length > 0;

  return { availableTokens, hasTokens };
}
