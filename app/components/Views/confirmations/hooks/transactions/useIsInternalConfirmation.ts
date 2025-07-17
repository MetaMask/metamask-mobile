import { MMM_ORIGIN } from '../../constants/confirmations';
import { useTransactionBatchesMetadata } from './useTransactionBatchesMetadata';
import { useTransactionMetadataRequest } from './useTransactionMetadataRequest';

export const useIsInternalConfirmation = () => {
  const transactionMetadata = useTransactionMetadataRequest();
  const transactionBatchesMetadata = useTransactionBatchesMetadata();

  const isInternalConfirmation =
    transactionMetadata?.origin === MMM_ORIGIN ||
    transactionBatchesMetadata?.origin === MMM_ORIGIN;

  return isInternalConfirmation;
};
