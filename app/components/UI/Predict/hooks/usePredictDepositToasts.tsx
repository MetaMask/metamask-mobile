import { TransactionType } from '@metamask/transaction-controller';
import { strings } from '../../../../../locales/i18n';
import Engine from '../../../../core/Engine';
import { usePredictDeposit } from './usePredictDeposit';
import { usePredictToasts } from './usePredictToasts';
import { usePredictBalance } from './usePredictBalance';
import { POLYMARKET_PROVIDER_ID } from '../providers/polymarket/constants';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import { formatPrice, calculateNetAmount } from '../utils/format';
import { getEvmAccountFromSelectedAccountGroup } from '../utils/accounts';
import { useSelector } from 'react-redux';
import { selectPredictPendingDepositByAddress } from '../selectors/predictController';

interface UsePredictDepositToastsParams {
  providerId?: string;
}

export const usePredictDepositToasts = ({
  providerId = POLYMARKET_PROVIDER_ID,
}: UsePredictDepositToastsParams = {}) => {
  const { loadBalance } = usePredictBalance();
  const { deposit } = usePredictDeposit();
  const navigation = useNavigation();

  const selectedInternalAccountAddress =
    getEvmAccountFromSelectedAccountGroup();

  const depositBatchId = useSelector(
    selectPredictPendingDepositByAddress({
      providerId,
      address: selectedInternalAccountAddress?.address ?? '',
    }),
  );

  usePredictToasts({
    onConfirmed: () => {
      loadBalance({ isRefresh: true });
    },
    transactionType: TransactionType.predictDeposit,
    transactionBatchId:
      depositBatchId !== 'pending' ? depositBatchId : undefined,
    pendingToastConfig: {
      title: strings('predict.deposit.adding_funds'),
      description: strings('predict.deposit.available_in_minutes', {
        minutes: 1,
      }),
      onPress: (transactionMeta) => {
        navigation.navigate(Routes.TRANSACTIONS_VIEW);

        // Then use a timeout to navigate to the specific transaction details
        if (transactionMeta?.id) {
          setTimeout(() => {
            navigation.navigate(Routes.TRANSACTION_DETAILS, {
              transactionId: transactionMeta.id,
            });
          }, 100);
        }
      },
    },
    confirmedToastConfig: {
      title: strings('predict.deposit.ready_to_trade'),
      description: strings('predict.deposit.account_ready_description', {
        amount: '{amount}',
      }),
      getAmount: (transactionMeta) => {
        const netAmount = calculateNetAmount({
          totalFiat: transactionMeta.metamaskPay?.totalFiat,
          bridgeFeeFiat: transactionMeta.metamaskPay?.bridgeFeeFiat,
          networkFeeFiat: transactionMeta.metamaskPay?.networkFeeFiat,
        });
        return (
          formatPrice(netAmount, {
            maximumDecimals: 2,
          }) ?? 'Balance'
        );
      },
    },
    errorToastConfig: {
      title: strings('predict.deposit.error_title'),
      description: strings('predict.deposit.error_description'),
      retryLabel: strings('predict.deposit.try_again'),
      onRetry: deposit,
    },
    clearTransaction: () =>
      Engine.context.PredictController.clearPendingDeposit({
        providerId,
      }),
  });
};
