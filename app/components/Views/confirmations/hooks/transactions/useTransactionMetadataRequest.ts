import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { useSelector } from 'react-redux';

import type { RootState } from '../../../../../reducers';
import { useGasFeeModalTransaction } from '../../context/gas-fee-modal-transaction';
import { selectCurrentTransaction } from '../../../../../selectors/transactionController';
import { EMPTY_ADDRESS } from '../../../../../constants/transaction';

export function useTransactionMetadataRequest() {
  const { transactionId: overrideTransactionId } = useGasFeeModalTransaction();

  return useSelector((state: RootState) =>
    selectCurrentTransaction(state, overrideTransactionId),
  );
}

export function useTransactionMetadataOrThrow(): TransactionMeta {
  return (
    useTransactionMetadataRequest() ?? {
      id: '',
      chainId: '0x123456',
      networkClientId: '',
      status: TransactionStatus.rejected,
      time: 0,
      txParams: {
        from: EMPTY_ADDRESS,
      },
      type: TransactionType.simpleSend,
    }
  );
}
