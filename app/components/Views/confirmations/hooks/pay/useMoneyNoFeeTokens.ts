import { useSelector } from 'react-redux';
import { TransactionType } from '@metamask/transaction-controller';
import { useTransactionPayToken } from './useTransactionPayToken';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { hasTransactionType } from '../../utils/transaction';
import { selectMoneyNoFeeTokens } from '../../../../UI/Money/selectors/featureFlags';
import { isTokenInWildcardList } from '../../../../UI/Earn/utils/wildcardTokenList';

const MONEY_ACCOUNT_TRANSACTION_TYPES: TransactionType[] = [
  TransactionType.moneyAccountDeposit,
  TransactionType.moneyAccountWithdraw,
];

export function useMoneyNoFeeTokens(): { isMoneyNoFeeToken: boolean } {
  const transactionMeta = useTransactionMetadataRequest();
  const { payToken } = useTransactionPayToken();
  const noFeeTokens = useSelector(selectMoneyNoFeeTokens);

  const isMoneyAccountTransaction = hasTransactionType(
    transactionMeta,
    MONEY_ACCOUNT_TRANSACTION_TYPES,
  );

  if (!isMoneyAccountTransaction || !payToken) {
    return { isMoneyNoFeeToken: false };
  }

  return {
    isMoneyNoFeeToken: isTokenInWildcardList(
      payToken.symbol,
      noFeeTokens,
      payToken.chainId,
    ),
  };
}
