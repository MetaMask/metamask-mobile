import { Mockttp } from 'mockttp';
import { AnvilManager } from '../../../tests/seeder/anvil-manager';
import { LocalNode } from '../../../tests/framework';
import { getEventsPayloads } from '../../../tests/helpers/analytics/helpers';

export const validateTransactionHashInTransactionFinalizedEvent = async (
  localNodes?: LocalNode[],
  mockServer?: Mockttp,
) => {
  // Validate txHash in Transaction Finalized Event
  const localNode = localNodes?.[0];
  if (!(localNode instanceof AnvilManager) || !mockServer) {
    throw new Error(
      'Expected first localNode to be an AnvilManager instance and mockServer to be defined',
    );
  }

  // Get latest transaction from the local node
  const latestBlockNumber = await localNode.getLatestBlockNumber();
  const block = await localNode.getBlockByNumber(latestBlockNumber);
  const latestTransaction = block?.transactions[0];

  if (!latestTransaction) {
    throw new Error(
      `No transactions found in block ${latestBlockNumber}. Expected at least one transaction.`,
    );
  }

  const events = await getEventsPayloads(mockServer);
  const transactionFinalizedEvent = events.find(
    (event) => event.event === 'Transaction Finalized',
  );

  if (!transactionFinalizedEvent) {
    throw new Error(
      'Transaction Finalized event not found in analytics events.',
    );
  }

  const eventTxHash = transactionFinalizedEvent.properties?.transaction_hash;

  if (!eventTxHash) {
    throw new Error(
      'Transaction Finalized event does not contain a transaction_hash property.',
    );
  }

  if (latestTransaction !== eventTxHash) {
    throw new Error(
      `Transaction hash mismatch: expected ${latestTransaction}, got ${eventTxHash}.
        Transaction Hash is not matching with the latest transaction on the local node.`,
    );
  }
};
