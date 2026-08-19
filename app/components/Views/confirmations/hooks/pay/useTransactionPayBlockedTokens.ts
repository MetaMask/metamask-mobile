import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectMetaMaskPayTokensFlags } from '../../../../../selectors/featureFlagController/confirmations';
import { getBlockedTokensForTransactionType } from '../../utils/transaction-pay';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';

export function useTransactionPayBlockedTokens() {
  const transactionMeta = useTransactionMetadataRequest();
  const payTokensFlags = useSelector(selectMetaMaskPayTokensFlags);

  return useMemo(
    () =>
      getBlockedTokensForTransactionType(
        payTokensFlags.blockedTokens,
        transactionMeta?.type,
      ),
    [payTokensFlags.blockedTokens, transactionMeta?.type],
  );
}
