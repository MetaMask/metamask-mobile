import type { Hex } from '@metamask/utils';
import type {
  MigrateParams,
  MigrationBlocker,
  MigrationInventory,
} from './types';

/**
 * Option B Money Account footprint migration (ADR 0006) for POC.
 * Linear: inventory → teardown → one exit batch → residual → re-provision.
 * No persist, resume, or abort. Destination must already exist.
 */
export class MoneyAccountMigrationPocService {
  async migrate({ source, destination }: MigrateParams): Promise<void> {
    const inventory = await this.collectInventory(source, destination);
    const blockers = await this.collectBlockers(inventory);
    if (blockers.length > 0) {
      throw new Error(blockers[0].kind);
    }
    if (!(await this.assertBatchFromSelf(inventory))) {
      throw new Error('atomic-batch-unsupported');
    }

    await this.teardown(inventory);
    await this.executeExitBatch(inventory);
    await this.persistResidualDelegation(inventory.source, inventory.destination);
    await this.reprovision(inventory.destination, inventory);
    await this.verifyOldInert(inventory);
  }

  async collectInventory(
    source: Hex,
    destination: Hex,
  ): Promise<MigrationInventory> {
    return {
      source,
      destination,
      chainId: '0x8f',
      vmUsd: 0n,
      musd: 0n,
      nativeWei: 0n,
      vaultAllowance: 0n,
      cardAllowance: 0n,
      chompIntentHashes: [],
      chompDelegationHashes: [],
      cardLinked: false,
    };
  }

  async collectBlockers(
    _inventory: MigrationInventory,
  ): Promise<MigrationBlocker[]> {
    return [];
  }

  async assertBatchFromSelf(_inventory: MigrationInventory): Promise<boolean> {
    return false;
  }

  async teardown(inventory: MigrationInventory): Promise<void> {
    await this.revokeChompIntents(inventory.chompIntentHashes);
    await this.revokeStorageDelegations(inventory.chompDelegationHashes);
    if (inventory.cardLinked) {
      await this.unlinkCard(inventory.source);
    }
  }

  async revokeChompIntents(_hashes: Hex[]): Promise<void> {
    // not in mobile yet: ChompApiService.revokeIntents (POST /v1/intent/revoke)
  }

  async revokeStorageDelegations(_hashes: Hex[]): Promise<void> {
    // AuthenticatedUserStorageService.revokeDelegation — skip residual hash.
  }

  async unlinkCard(_address: Hex): Promise<void> {
    // CardController.linkMoneyAccountCard({ moneyAccountAddress, delegationAmountHuman: '0' })
  }

  async executeExitBatch(inventory: MigrationInventory): Promise<void> {
    const exitBatchId = await this.submitExitBatch(inventory);
    if (!exitBatchId) {
      throw new Error('exit-batch-not-submitted');
    }
    await this.awaitExitBatch(exitBatchId);
  }

  async submitExitBatch(_inventory: MigrationInventory): Promise<Hex | null> {
    // addTransactionBatch({ atomic: true, disableSequential: true })
    return null;
  }

  async awaitExitBatch(_batchId: Hex): Promise<void> {
    // Await existing batch.
  }

  async persistResidualDelegation(
    _source: Hex,
    _destination: Hex,
  ): Promise<void> {
    // Sign once: delegator=old, delegate=new, empty caveats.
  }

  async reprovision(
    destination: Hex,
    inventory: MigrationInventory,
  ): Promise<void> {
    await this.upgradeDestination(destination);
    if (inventory.cardLinked) {
      await this.relinkCard(destination);
    }
    await this.setActiveMoneyAccountId(destination);
  }

  async upgradeDestination(_destination: Hex): Promise<void> {
    // MoneyAccountUpgradeController.upgradeAccount(destination)
  }

  async relinkCard(_destination: Hex): Promise<void> {
    // CardController.linkMoneyAccountCard({ moneyAccountAddress: dest, cap })
  }

  async setActiveMoneyAccountId(_destination: Hex): Promise<void> {
    // not in mobile yet: persist pointer vs primary-HD selector
  }

  async verifyOldInert(_inventory: MigrationInventory): Promise<void> {
    // vmUSD/mUSD/allowances 0, 7702 kept, no active CHOMP intents, Card unlinked.
  }
}
