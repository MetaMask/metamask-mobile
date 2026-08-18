import { BaseController, type StateMetadata } from '@metamask/base-controller';
import type { Hex } from '@metamask/utils';
import type {
  MigrateParams,
  MigrationBlocker,
  MigrationInventory,
  MigrationSnapshot,
  MigrationStatus,
} from '../../../../lib/Money/migration/types';
import {
  AUTO_RESTORE_AFTER_MS,
  EMPTY_SNAPSHOT,
} from '../../../../lib/Money/migration/types';
import {
  MONEY_ACCOUNT_MIGRATION_CONTROLLER_NAME,
  type MoneyAccountMigrationControllerMessenger,
  type MoneyAccountMigrationControllerState,
} from './types';

export { AUTO_RESTORE_AFTER_MS, EMPTY_SNAPSHOT };

const metadata: StateMetadata<MoneyAccountMigrationControllerState> = {
  status: {
    persist: true,
    includeInDebugSnapshot: true,
    includeInStateLogs: true,
    usedInUi: true,
  },
  inventory: {
    persist: true,
    includeInDebugSnapshot: false,
    includeInStateLogs: true,
    usedInUi: false,
  },
  destination: {
    persist: true,
    includeInDebugSnapshot: true,
    includeInStateLogs: true,
    usedInUi: true,
  },
  exitBatchId: {
    persist: true,
    includeInDebugSnapshot: true,
    includeInStateLogs: true,
    usedInUi: false,
  },
  residualDelegation: {
    persist: true,
    includeInDebugSnapshot: false,
    includeInStateLogs: false,
    usedInUi: false,
  },
  residualDelegationHash: {
    persist: true,
    includeInDebugSnapshot: true,
    includeInStateLogs: true,
    usedInUi: false,
  },
  tornDownAt: {
    persist: true,
    includeInDebugSnapshot: true,
    includeInStateLogs: true,
    usedInUi: false,
  },
  formerMoneyAccounts: {
    persist: true,
    includeInDebugSnapshot: false,
    includeInStateLogs: true,
    usedInUi: true,
  },
};

export const defaultMoneyAccountMigrationControllerState: MoneyAccountMigrationControllerState =
  EMPTY_SNAPSHOT;

export function fundsMoved(
  plan: MigrationInventory,
  live: MigrationInventory,
): boolean {
  if (plan.vmUsd === 0n && plan.musd === 0n) {
    // Empty plan cannot prove a batch ran — allowance=0 is also the
    // pre-migrate state, and treating it as moved would skip teardown.
    return false;
  }
  return (
    (plan.vmUsd === 0n || live.vmUsd === 0n) &&
    (plan.musd === 0n || live.musd === 0n)
  );
}

export function reconcile(params: {
  status: MigrationStatus;
  plan: MigrationInventory;
  live: MigrationInventory;
}): MigrationStatus {
  const { status, plan, live } = params;
  if (status === 'IDLE' || status === 'VERIFIED_INERT') {
    return status;
  }
  if (
    (status === 'INVENTORIED' || status === 'TORN_DOWN') &&
    fundsMoved(plan, live)
  ) {
    return 'BATCH_EXECUTED';
  }
  return status;
}

const sameAddress = (a: Hex, b: Hex) => a.toLowerCase() === b.toLowerCase();

/**
 * Option B Money Account footprint migration (ADR 0006).
 * Destination must already exist (`createMoneyAccount`). No UI.
 * Crash/kill: persist snapshot; `resume()` continues. Never double-submit.
 */
export class MoneyAccountMigrationController extends BaseController<
  typeof MONEY_ACCOUNT_MIGRATION_CONTROLLER_NAME,
  MoneyAccountMigrationControllerState,
  MoneyAccountMigrationControllerMessenger
> {
  #running = false;

  constructor({
    messenger,
    state,
  }: {
    messenger: MoneyAccountMigrationControllerMessenger;
    state?: Partial<MoneyAccountMigrationControllerState>;
  }) {
    super({
      name: MONEY_ACCOUNT_MIGRATION_CONTROLLER_NAME,
      messenger,
      metadata,
      state: {
        ...defaultMoneyAccountMigrationControllerState,
        ...state,
      },
    });
  }

  get snapshot(): MigrationSnapshot {
    return this.state;
  }

  async migrate({ source, destination }: MigrateParams): Promise<void> {
    await this.#withLock(async () => {
      const snap = this.state;
      if (snap.status !== 'IDLE' && snap.status !== 'VERIFIED_INERT') {
        if (
          snap.inventory &&
          snap.destination &&
          sameAddress(snap.inventory.source, source) &&
          sameAddress(snap.destination, destination)
        ) {
          await this.#continue();
          return;
        }
        throw new Error('migration-in-progress');
      }

      const inventory = await this.collectInventory(source, destination);
      const blockers = await this.collectBlockers(inventory);
      if (blockers.length > 0) {
        return;
      }
      if (!(await this.assertBatchFromSelf(inventory))) {
        return;
      }

      this.update(() => ({
        ...snap,
        status: 'INVENTORIED',
        inventory,
        destination,
        exitBatchId: null,
        residualDelegation: null,
        residualDelegationHash: null,
        tornDownAt: null,
      }));
      await this.#continue();
    });
  }

  async resume(): Promise<void> {
    await this.#withLock(() => this.#continue());
  }

  async abort(): Promise<void> {
    await this.#withLock(async () => {
      const snap = this.state;
      if (snap.status === 'IDLE' || snap.status === 'VERIFIED_INERT') {
        return;
      }
      if (snap.status === 'INVENTORIED') {
        this.#clearInFlight(snap);
        return;
      }
      if (snap.status === 'TORN_DOWN') {
        if (snap.exitBatchId) {
          throw new Error('batch-in-flight');
        }
        if (snap.inventory) {
          await this.restore(snap.inventory);
        }
        this.#clearInFlight(snap);
        return;
      }
      throw new Error('point-of-no-return');
    });
  }

  async sweepFormerAccount(_oldAddress: Hex): Promise<void> {
    // redeemDelegations as the new key — encodeRedeemDelegations exists;
    // no high-level sweep helper in mobile yet.
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

  async restore(_inventory: MigrationInventory): Promise<void> {
    // upgradeAccount(source) + Card re-link. Crash during restore stays TORN_DOWN.
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
    let { exitBatchId } = this.state;
    if (exitBatchId) {
      await this.awaitExitBatch(exitBatchId);
      return;
    }

    const blockers = await this.collectBlockers(inventory);
    if (blockers.length > 0) {
      throw new Error(blockers[0].kind);
    }

    exitBatchId = await this.submitExitBatch(inventory);
    if (!exitBatchId) {
      return;
    }
    this.update((state) => {
      state.exitBatchId = exitBatchId;
    });
    await this.awaitExitBatch(exitBatchId);
  }

  async submitExitBatch(_inventory: MigrationInventory): Promise<Hex | null> {
    // addTransactionBatch({ atomic: true, disableSequential: true })
    return null;
  }

  async awaitExitBatch(_batchId: Hex): Promise<void> {
    // Await existing batch. Failed/dropped: caller clears exitBatchId.
  }

  async persistResidualDelegation(
    _source: Hex,
    _destination: Hex,
  ): Promise<void> {
    const { residualDelegation } = this.state;
    if (residualDelegation) {
      return;
    }
    // Sign once: delegator=old, delegate=new, empty caveats. Persist blob.
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

  async persistFormerLink(source: Hex, destination: Hex): Promise<void> {
    const snap = this.state;
    this.update(() => ({
      ...snap,
      formerMoneyAccounts: {
        ...snap.formerMoneyAccounts,
        [source.toLowerCase()]: {
          newAddress: destination,
          residualDelegation: snap.residualDelegation,
          residualDelegationHash: snap.residualDelegationHash,
        },
      },
    }));
  }

  async persistAccountsApiAlias(
    _source: Hex,
    _destination: Hex,
  ): Promise<void> {
    // not in mobile yet: CHOMP/Accounts API old→new alias
  }

  async acquireMigrationLock(_source: Hex): Promise<void> {
    // not in mobile yet: backend cross-device migration lock
  }

  async #withLock(fn: () => Promise<void>): Promise<void> {
    if (this.#running) {
      throw new Error('migration-in-progress');
    }
    this.#running = true;
    try {
      await fn();
    } finally {
      this.#running = false;
    }
  }

  async #continue(): Promise<void> {
    const snap = this.state;
    if (
      snap.status === 'IDLE' ||
      snap.status === 'VERIFIED_INERT' ||
      !snap.inventory ||
      !snap.destination
    ) {
      return;
    }

    const live = await this.collectInventory(
      snap.inventory.source,
      snap.destination,
    );
    let status = reconcile({
      status: snap.status,
      plan: snap.inventory,
      live,
    });
    if (status !== snap.status) {
      this.update((state) => {
        state.status = status;
      });
    }

    if (
      status === 'TORN_DOWN' &&
      !this.state.exitBatchId &&
      this.state.tornDownAt !== null &&
      Date.now() - (this.state.tornDownAt as number) >= AUTO_RESTORE_AFTER_MS
    ) {
      await this.restore(snap.inventory);
      this.#clearInFlight(this.state);
      return;
    }

    const inventory: MigrationInventory = {
      ...live,
      destination: snap.destination,
    };

    if (status === 'INVENTORIED') {
      await this.teardown(inventory);
      this.update((state) => {
        state.status = 'TORN_DOWN';
        state.tornDownAt = Date.now();
      });
      status = 'TORN_DOWN';
    }

    if (status === 'TORN_DOWN') {
      await this.executeExitBatch(inventory);
      this.update((state) => {
        state.status = 'BATCH_EXECUTED';
      });
      status = 'BATCH_EXECUTED';
    }

    if (status === 'BATCH_EXECUTED') {
      await this.persistResidualDelegation(
        inventory.source,
        inventory.destination,
      );
      await this.reprovision(inventory.destination, inventory);
      this.update((state) => {
        state.status = 'RE_PROVISIONED';
      });
      status = 'RE_PROVISIONED';
    }

    if (status === 'RE_PROVISIONED') {
      await this.verifyOldInert(inventory);
      await this.persistFormerLink(inventory.source, inventory.destination);
      this.update((state) => {
        state.status = 'VERIFIED_INERT';
      });
    }
  }

  #clearInFlight(snap: MigrationSnapshot): void {
    this.update(() => ({
      ...EMPTY_SNAPSHOT,
      formerMoneyAccounts: snap.formerMoneyAccounts,
    }));
  }
}
