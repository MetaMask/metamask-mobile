import { useSelector } from 'react-redux';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { selectSmartTransactionsEnabled } from '../../../../../selectors/smartTransactionsController';
import { RootState } from '../../../../../reducers';

export function useIsGaslessSupported() {
  const transactionMeta = useTransactionMetadataRequest();

  const { chainId } = transactionMeta || {};

  const isSmartTransaction = useSelector((state: RootState) =>
    selectSmartTransactionsEnabled(state, chainId),
  );

  const isSupported = isSmartTransaction;

  return {
    isSupported,
    isSmartTransaction,
  };
}
