import { useSelector } from 'react-redux';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { selectSmartTransactionsEnabled } from '../../../../../selectors/smartTransactionsController';
import { RootState } from '../../../../../reducers';
import { useAsyncResult } from '../../../../hooks/useAsyncResult';
import { isSendBundleSupported } from '../../../../../core/RPCMethods/sentinel-api';

export function useIsGaslessSupported() {
  const transactionMeta = useTransactionMetadataRequest();

  const { chainId } = transactionMeta || {};

  const { value: sendBundleSupportsChain } = useAsyncResult(
    async () => (chainId ? isSendBundleSupported(chainId) : false),
    [chainId],
  );

  const isSmartTransaction = useSelector((state: RootState) =>
    selectSmartTransactionsEnabled(state, chainId),
  );

  const isSupported = Boolean(isSmartTransaction && sendBundleSupportsChain);

  return {
    isSupported,
    isSmartTransaction,
  };
}
