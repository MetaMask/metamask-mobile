import { useSelector } from 'react-redux';
import {
  hasTransactionType,
  TransactionType,
} from '@metamask/transaction-controller';

import { selectMmPayDebugEnabled } from '../../../../../../reducers/experimentalSettings/selectors';
import { useTransactionMetadataRequest } from '../../transactions/useTransactionMetadataRequest';
import { MM_PAY_TRANSACTION_TYPES } from '../../../constants/confirmations';
import { isRc, isTestEnvironment } from '../../../../../../util/test/utils';

export function useIsMmPayDebugVisible(): boolean {
  const isDebugEnabled = useSelector(selectMmPayDebugEnabled);
  const transactionMeta = useTransactionMetadataRequest();

  const isDebugBuild = isRc || isTestEnvironment;

  if (!isDebugBuild || !isDebugEnabled || !transactionMeta) {
    return false;
  }

  return hasTransactionType(
    transactionMeta,
    MM_PAY_TRANSACTION_TYPES as readonly TransactionType[],
  );
}
