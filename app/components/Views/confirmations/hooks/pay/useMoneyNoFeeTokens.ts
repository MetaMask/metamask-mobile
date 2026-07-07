import { useSelector } from 'react-redux';
import { TransactionType } from '@metamask/transaction-controller';
import { useTransactionPayToken } from './useTransactionPayToken';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { hasTransactionType } from '../../utils/transaction';
import { selectRelayFixedSpread } from '../../../../../selectors/featureFlagController/confirmations';
import { isSubsidizedSource } from '../../utils/relayFixedSpread';

const MONEY_ACCOUNT_TRANSACTION_TYPES: TransactionType[] = [
  TransactionType.moneyAccountDeposit,
  TransactionType.moneyAccountWithdraw,
];

export function useMoneyNoFeeTokens(): { isMoneyNoFeeToken: boolean } {
  const transactionMeta = useTransactionMetadataRequest();
  const { payToken } = useTransactionPayToken();
  const relayFixedSpread = useSelector(selectRelayFixedSpread);

  const isMoneyAccountTransaction = hasTransactionType(
    transactionMeta,
    MONEY_ACCOUNT_TRANSACTION_TYPES,
  );

  if (!isMoneyAccountTransaction || !payToken) {
    return { isMoneyNoFeeToken: false };
  }

  return {
    isMoneyNoFeeToken: isSubsidizedSource(relayFixedSpread, {
      chainId: payToken.chainId,
      address: payToken.address,
    }),
  };
}
