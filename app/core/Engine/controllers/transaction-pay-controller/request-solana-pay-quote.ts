import Engine from '../../Engine';

const quoteRequests = new Map<string, Promise<void>>();

export async function requestSolanaPayQuote(
  transactionId: string,
): Promise<void> {
  const activeRequest = quoteRequests.get(transactionId);
  if (activeRequest) {
    return await activeRequest;
  }

  const request = Engine.context.TransactionPayController.getSolanaPayQuote({
    transactionId,
  }).then(() => undefined);
  quoteRequests.set(transactionId, request);

  try {
    await request;
  } finally {
    if (quoteRequests.get(transactionId) === request) {
      quoteRequests.delete(transactionId);
    }
  }
}
