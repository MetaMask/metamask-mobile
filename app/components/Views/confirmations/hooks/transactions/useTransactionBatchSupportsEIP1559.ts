import {
  GasFeeEstimateType,
  TransactionBatchMeta,
} from '@metamask/transaction-controller';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../reducers';
import { checkNetworkAndAccountSupports1559 } from '../../../../../selectors/networkController';

export function useTransactionBatchSupportsEIP1559(
  transactionBatchMeta: TransactionBatchMeta,
) {
  const { networkClientId } = transactionBatchMeta;
  const isLegacyTxn =
    transactionBatchMeta.gasFeeEstimates?.type === GasFeeEstimateType.Legacy ||
    transactionBatchMeta.gasFeeEstimates?.type === GasFeeEstimateType.GasPrice;
  const networkSupportsEIP1559 = useSelector((state: RootState) =>
    checkNetworkAndAccountSupports1559(state, networkClientId),
  );

  const supportsEIP1559 = networkSupportsEIP1559 && !isLegacyTxn;

  return { supportsEIP1559 };
}
