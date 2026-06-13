import { useSelector } from 'react-redux';
import { TransactionType } from '@metamask/transaction-controller';
import { useTransactionPayToken } from './useTransactionPayToken';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { hasTransactionType } from '../../utils/transaction';
import { selectMetaMaskPayFlags } from '../../../../../selectors/featureFlagController/confirmations';
import { selectMoneyNoFeeTokens } from '../../../../UI/Money/selectors/featureFlags';
import { isTokenInWildcardList } from '../../../../UI/Earn/utils/wildcardTokenList';

const MONEY_ACCOUNT_TRANSACTION_TYPES: TransactionType[] = [
  TransactionType.moneyAccountDeposit,
  TransactionType.moneyAccountWithdraw,
];

/**
 * Returns `true` when the selected pay token incurs no fees for a money
 * account deposit or withdraw — either the chain is in `noNetworkFeeChains`
 * or the token+chain is in `selectMoneyNoFeeTokens`.
 */
export function useMoneyDepositNoFee(): boolean {
  const transactionMeta = useTransactionMetadataRequest();
  const { payToken } = useTransactionPayToken();
  const { noNetworkFeeChains } = useSelector(selectMetaMaskPayFlags);
  const noFeeTokens = useSelector(selectMoneyNoFeeTokens);

  const isMoneyAccountTransaction = hasTransactionType(
    transactionMeta,
    MONEY_ACCOUNT_TRANSACTION_TYPES,
  );

  if (!isMoneyAccountTransaction || !payToken) {
    return false;
  }

  return (
    noNetworkFeeChains.includes(payToken.chainId) ||
    isTokenInWildcardList(payToken.symbol, noFeeTokens, payToken.chainId)
  );
}
