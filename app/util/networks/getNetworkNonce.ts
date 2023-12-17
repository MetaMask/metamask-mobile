import { type TransactionController } from '@metamask/transaction-controller';
import Engine from '../../core/Engine';

async function getNetworkNonce({ from }: { from: string }) {
  const {
    TransactionController,
  }: { TransactionController: TransactionController } = Engine.context;

  const { nextNonce, releaseLock } = await TransactionController.getNonceLock(
    from,
  );

  releaseLock();

  return nextNonce;
}

export default getNetworkNonce;
