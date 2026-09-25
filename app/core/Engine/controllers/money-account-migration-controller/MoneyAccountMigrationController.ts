import { BaseController, type StateMetadata } from '@metamask/base-controller';
import type { Hex } from '@metamask/utils';
import {
  AUTO_RESTORE_AFTER_MS,
  EMPTY_CURSOR,
  type MigrateParams,
  type MigrationBlocker,
  type MigrationCursor,
  type MigrationInventory,
  type MigrationPhase,
} from '../../../../lib/Money/migration/types';
import type { MoneyAccountMigrationPocService } from '../../../../lib/Money/migration/MoneyAccountMigrationPocService';
import {
  MONEY_ACCOUNT_MIGRATION_CONTROLLER_NAME,
  type MoneyAccountMigrationControllerMessenger,
  type MoneyAccountMigrationControllerState,
} from './types';

export { AUTO_RESTORE_AFTER_MS, EMPTY_CURSOR };

const persist = {
  persist: true,
  includeInDebugSnapshot: true,
  includeInStateLogs: true,
  usedInUi: true,
} as const;

const metadata: StateMetadata<MoneyAccountMigrationControllerState> = {
  phase: persist,
  oldAddress: persist,
  newAddress: persist,
  chainId: persist,
  planHash: persist,
  cardWasLinked: persist,
  exitBatchId: persist,
  updatedAt: persist,
  migrated: persist,
};

export const defaultMoneyAccountMigrationControllerState: MoneyAccountMigrationControllerState =
  { ...EMPTY_CURSOR, migrated: {} };

const sameAddress = (a: Hex, b: Hex) => a.toLowerCase() === b.toLowerCase();

export function planHash(inventory: MigrationInventory): string {
  return [
    inventory.source.toLowerCase(),
    inventory.destination.toLowerCase(),
    inventory.chainId,
    inventory.vmUsd,
    inventory.musd,
    inventory.nativeWei,
  ].join(':');
}

/**
 * Option B Money Account footprint migration (ADR 0006 + 0007 resume).
 * Local cursor only; re-read chain/backend/AUS on resume. Never double-submit.
 * On-chain/backend steps live in `MoneyAccountMigrationPocService`.
 */
export class MoneyAccountMigrationController extends BaseController<
  typeof MONEY_ACCOUNT_MIGRATION_CONTROLLER_NAME,
  MoneyAccountMigrationControllerState,
  MoneyAccountMigrationControllerMessenger
> {
  #running = false;

  readonly #steps: MoneyAccountMigrationPocService;

  constructor({
    messenger,
    state,
    steps,
  }: {
    messenger: MoneyAccountMigrationControllerMessenger;
    state?: Partial<MoneyAccountMigrationControllerState>;
    steps: MoneyAccountMigrationPocService;
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
    this.#steps = steps;
  }

  async migrate({ source, destination }: MigrateParams): Promise<void> {
    await this.#withLock(async () => {
      const cursor = this.state;
      if (cursor.phase) {
        if (
          cursor.oldAddress &&
          cursor.newAddress &&
          sameAddress(cursor.oldAddress, source) &&
          sameAddress(cursor.newAddress, destination)
        ) {
          await this.#continue();
          return;
        }
        throw new Error('migration-in-progress');
      }
      if (cursor.migrated[source.toLowerCase()]) {
        throw new Error('already-migrated');
      }

      const inventory = await this.collectInventory(source, destination);
      const blockers = await this.collectBlockers(inventory);
      if (blockers.length > 0) {
        return;
      }
      if (!(await this.assertBatchFromSelf(inventory))) {
        return;
      }

      this.#patch({
        phase: 'CONSENTED',
        oldAddress: source,
        newAddress: destination,
        chainId: inventory.chainId,
        planHash: planHash(inventory),
        cardWasLinked: inventory.cardLinked,
        exitBatchId: null,
        updatedAt: Date.now(),
      });
      await this.#continue();
    });
  }

  async resume(): Promise<void> {
    await this.#withLock(() => this.#continue());
  }

  async abort(): Promise<void> {
    await this.#withLock(async () => {
      const { phase, exitBatchId, cardWasLinked } = this.state;
      if (!phase) {
        return;
      }
      if (phase === 'CONSENTED') {
        this.#clear();
        return;
      }
      if (phase === 'TORN_DOWN' && !exitBatchId) {
        if (cardWasLinked) {
          await this.restore();
        }
        this.#clear();
        return;
      }
      throw new Error('point-of-no-return');
    });
  }

  collectInventory(source: Hex, destination: Hex): Promise<MigrationInventory> {
    return this.#steps.collectInventory(source, destination);
  }

  collectBlockers(inventory: MigrationInventory): Promise<MigrationBlocker[]> {
    return this.#steps.collectBlockers(inventory);
  }

  assertBatchFromSelf(inventory: MigrationInventory): Promise<boolean> {
    return this.#steps.assertBatchFromSelf(inventory);
  }

  async teardown(): Promise<void> {
    const { cardWasLinked, oldAddress } = this.state;
    if (cardWasLinked && oldAddress) {
      await this.unlinkCard(oldAddress);
    }
  }

  /** Re-link Card on old. Crash during restore stays TORN_DOWN. */
  async restore(): Promise<void> {
    const { oldAddress } = this.state;
    if (oldAddress) {
      // ponytail: cap not in cursor (ADR 0007); after a cold resume re-link uses the service default
      await this.relinkCard(oldAddress);
    }
  }

  unlinkCard(address: Hex): Promise<void> {
    return this.#steps.unlinkCard(address);
  }

  async executeExitBatch(inventory: MigrationInventory): Promise<void> {
    const existing = this.state.exitBatchId;
    if (existing) {
      await this.awaitExitBatch(existing);
      this.#setPhase('BATCH_EXECUTED');
      return;
    }

    const exitBatchId = await this.submitExitBatch(inventory);
    if (!exitBatchId) {
      // Nothing to move: old already holds no footprint.
      this.#setPhase('BATCH_EXECUTED');
      return;
    }
    this.#patch({
      phase: 'BATCH_SUBMITTED',
      exitBatchId,
      updatedAt: Date.now(),
    });
    await this.awaitExitBatch(exitBatchId);
    this.#setPhase('BATCH_EXECUTED');
  }

  submitExitBatch(inventory: MigrationInventory): Promise<Hex | null> {
    return this.#steps.submitExitBatch(inventory);
  }

  awaitExitBatch(exitBatchId: Hex): Promise<void> {
    return this.#steps.awaitExitBatch(exitBatchId);
  }

  /** Sign once into AUS if the blob is missing. Never copied locally. */
  async persistResidualDelegation(): Promise<void> {
    const { oldAddress, newAddress, chainId } = this.state;
    if (!oldAddress || !newAddress || !chainId) {
      return;
    }
    await this.#steps.persistResidualDelegation(
      oldAddress,
      newAddress,
      chainId,
    );
  }

  async reprovision(): Promise<void> {
    const { oldAddress, newAddress } = this.state;
    if (!oldAddress || !newAddress) {
      return;
    }
    await this.upgradeDestination(newAddress);
    if (this.state.cardWasLinked) {
      await this.relinkCard(newAddress);
    }
    this.markMigrated(oldAddress, newAddress);
  }

  upgradeDestination(destination: Hex): Promise<void> {
    return this.#steps.upgradeDestination(destination);
  }

  relinkCard(destination: Hex): Promise<void> {
    return this.#steps.relinkCard(destination);
  }

  /** `selectPrimaryMoneyAccount` follows this pointer; the old MoneyAccount record stays. */
  markMigrated(oldAddress: Hex, newAddress: Hex): void {
    this.update((state) => {
      state.migrated[oldAddress.toLowerCase()] = {
        newAddress,
        migratedAt: Date.now(),
      };
    });
  }

  async verifyOldInert(): Promise<void> {
    const { oldAddress, newAddress } = this.state;
    if (oldAddress && newAddress) {
      await this.#steps.verifyOldInert(oldAddress, newAddress);
    }
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
    let { phase } = this.state;
    if (!phase || !this.state.oldAddress || !this.state.newAddress) {
      return;
    }

    if (
      this.state.exitBatchId &&
      (phase === 'TORN_DOWN' || phase === 'BATCH_SUBMITTED')
    ) {
      await this.awaitExitBatch(this.state.exitBatchId);
      this.#setPhase('BATCH_EXECUTED');
      phase = 'BATCH_EXECUTED';
    }

    if (phase === 'CONSENTED') {
      const inventory = await this.#recheck();
      if (!inventory) {
        return;
      }
      await this.teardown();
      this.#patch({ phase: 'TORN_DOWN', updatedAt: Date.now() });
      phase = 'TORN_DOWN';
      await this.#runFromTornDown(inventory);
      return;
    }

    if (phase === 'TORN_DOWN' || phase === 'BATCH_SUBMITTED') {
      const inventory = await this.collectInventory(
        this.state.oldAddress,
        this.state.newAddress,
      );
      await this.#runFromTornDown(inventory);
      return;
    }

    await this.#finishAfterBatch();
  }

  async #recheck(): Promise<MigrationInventory | null> {
    const { oldAddress, newAddress } = this.state;
    if (!oldAddress || !newAddress) {
      return null;
    }
    const live = await this.collectInventory(oldAddress, newAddress);
    const blockers = await this.collectBlockers(live);
    if (blockers.length > 0) {
      return null;
    }
    // ponytail: spend-drift re-consent when consent UI exists
    return live;
  }

  async #runFromTornDown(inventory: MigrationInventory): Promise<void> {
    if (
      this.state.phase === 'TORN_DOWN' &&
      !this.state.exitBatchId &&
      this.state.updatedAt !== null &&
      Date.now() - this.state.updatedAt >= AUTO_RESTORE_AFTER_MS
    ) {
      await this.restore();
      this.#clear();
      return;
    }

    if (
      this.state.phase === 'TORN_DOWN' ||
      this.state.phase === 'BATCH_SUBMITTED'
    ) {
      await this.executeExitBatch(inventory);
    }
    await this.#finishAfterBatch();
  }

  async #finishAfterBatch(): Promise<void> {
    const { phase } = this.state;
    if (
      phase !== 'BATCH_EXECUTED' &&
      phase !== 'RESIDUAL_SIGNED' &&
      phase !== 'REPROVISIONING'
    ) {
      return;
    }

    if (phase === 'BATCH_EXECUTED') {
      await this.persistResidualDelegation();
      this.#setPhase('RESIDUAL_SIGNED');
    }
    if (this.state.phase === 'RESIDUAL_SIGNED') {
      this.#setPhase('REPROVISIONING');
    }
    await this.reprovision();
    await this.verifyOldInert();
    this.#clear();
  }

  #setPhase(phase: MigrationPhase): void {
    this.#patch({ phase, updatedAt: Date.now() });
  }

  #patch(partial: Partial<MigrationCursor>): void {
    this.update((state) => {
      Object.assign(state, partial);
    });
  }

  #clear(): void {
    this.update((state) => ({ ...EMPTY_CURSOR, migrated: state.migrated }));
  }
}
