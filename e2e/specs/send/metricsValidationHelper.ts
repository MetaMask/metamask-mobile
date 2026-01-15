import { Mockttp } from 'mockttp';
import { AnvilManager } from '../../seeder/anvil-manager';
import { LocalNode } from '../../framework';
import { getEventsPayloads } from '../analytics/helpers';

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

  const events = await getEventsPayloads(mockServer);
  const transactionFinalizedEvent = events.find(
    (event) => event.event === 'Transaction Finalized',
  );
  const eventTxHash = transactionFinalizedEvent?.properties.transaction_hash;

  if (latestTransaction !== eventTxHash) {
    throw new Error(
      `Transaction hash mismatch: expected ${latestTransaction}, got ${eventTxHash}. 
        Transaction Hash is not matching with the latest transaction on the local node.`,
    );
  }
};
