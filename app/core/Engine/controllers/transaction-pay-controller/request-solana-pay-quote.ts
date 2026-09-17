import type { GetSolanaPayQuoteRequest } from '@metamask/transaction-pay-controller';
import Engine from '../../Engine';

const quoteRequests = new Map<string, Promise<void>>();

export async function requestSolanaPayQuote(
  quoteRequest: GetSolanaPayQuoteRequest,
): Promise<void> {
  const { transactionId } = quoteRequest;
  const activeRequest = quoteRequests.get(transactionId);
  if (activeRequest) {
    return await activeRequest;
  }

  const request = Engine.context.TransactionPayController.getSolanaPayQuote(
    quoteRequest,
  ).then(() => undefined);
  quoteRequests.set(transactionId, request);

  try {
    await request;
  } finally {
    if (quoteRequests.get(transactionId) === request) {
      quoteRequests.delete(transactionId);
    }
  }
}
