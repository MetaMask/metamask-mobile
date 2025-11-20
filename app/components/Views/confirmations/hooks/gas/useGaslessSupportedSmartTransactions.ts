import { Hex } from '@metamask/utils';
import { useSelector } from 'react-redux';
import { isSendBundleSupported } from '../../../../../util/transactions/sentinel-api';
import { selectShouldUseSmartTransaction } from '../../../../../selectors/smartTransactionsController';
import { useAsyncResult } from '../../../../hooks/useAsyncResult';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { RootState } from '../../../../../reducers';

export function useGaslessSupportedSmartTransactions(): {
  isSmartTransaction: boolean;
  isSupported: boolean;
  pending: boolean;
} {
  const transactionMeta = useTransactionMetadataRequest();

  const { chainId } = transactionMeta ?? {};
  const isSmartTransaction = useSelector((state: RootState) =>
    selectShouldUseSmartTransaction(state, chainId),
  );

  const { value: sendBundleSupported, pending } = useAsyncResult(
    async () => (chainId ? isSendBundleSupported(chainId as Hex) : false),
    [chainId],
  );

  return {
    isSmartTransaction: Boolean(isSmartTransaction),
    isSupported: Boolean(isSmartTransaction && sendBundleSupported),
    pending,
  };
}
