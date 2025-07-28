import { TransactionType } from '@metamask/transaction-controller';
import { parseStandardTokenTransactionData } from '../../utils/transaction';
import { useTransactionMetadataRequest } from './useTransactionMetadataRequest';

export function useTransferRecipient() {
  const transactionMetadata = useTransactionMetadataRequest();
  const transactionData = parseStandardTokenTransactionData(
    transactionMetadata?.txParams?.data,
  );

  if (!transactionMetadata) {
    return null;
  }

  const { type, txParams } = transactionMetadata;
  const { to: transactionTo } = txParams;

  const transferTo =
    transactionData?.args?._to || transactionData?.args?.to || transactionTo;

  return type === TransactionType.simpleSend ? transactionTo : transferTo;
}
