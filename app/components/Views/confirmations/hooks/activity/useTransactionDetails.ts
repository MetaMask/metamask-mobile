import { useSelector } from 'react-redux';
import { useParams } from '../../../../../util/navigation/navUtils';
import { selectTransactionMetadataById } from '../../../../../selectors/transactionController';
import { RootState } from '../../../../../reducers';
import { TransactionMeta } from '@metamask/transaction-controller';

export function useTransactionDetails() {
  const { transactionId } = useParams<{ transactionId: string }>();

  const transactionMeta = useSelector((state: RootState) =>
    selectTransactionMetadataById(state, transactionId),
  ) as TransactionMeta;

  return { transactionMeta };
}
