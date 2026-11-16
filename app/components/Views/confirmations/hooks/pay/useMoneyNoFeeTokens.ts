import { useSelector } from 'react-redux';
import {
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import { useTransactionPayToken } from './useTransactionPayToken';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { selectRelayFixedSpread } from '../../../../../selectors/featureFlagController/confirmations';
import { isSubsidizedSource } from '../../utils/relayFixedSpread';
import { getPaymentTokenEvmAsset } from '../../../../../util/transactions/payment-token';

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

  const payTokenAsset = getPaymentTokenEvmAsset(payToken);

  if (!isMoneyAccountTransaction || !payTokenAsset) {
    return { isMoneyNoFeeToken: false };
  }

  return {
    isMoneyNoFeeToken: isSubsidizedSource(relayFixedSpread, payTokenAsset),
  };
}
