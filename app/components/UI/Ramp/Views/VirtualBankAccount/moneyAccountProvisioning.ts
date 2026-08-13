import type {
  AutorampAccount,
  MoneyAccountWalletRegistrationResult,
} from '@metamask/ramps-controller';
import Engine from '../../../../../core/Engine';
import { buildMoneyAccountAutorampParams } from './moneyAccountAutoramp';

/**
 * Provisioning promises keyed by lowercased wallet address, so the two paths
 * that react to KYC `completed` — the `KycController:statusChanged` subscriber
 * (push) and the success screen's imperative status read (pull) — collapse onto
 * one run instead of registering the wallet twice (two signature prompts) or
 * creating two autoramps for the same wallet.
 */
const walletRegistrations = new Map<
  string,
  Promise<MoneyAccountWalletRegistrationResult>
>();
const autoramps = new Map<string, Promise<AutorampAccount>>();

/**
 * Returns the run already recorded for `address`, or starts and records one.
 *
 * A rejected run is evicted so the next caller retries: KYC stays `completed`,
 * so a transient signing or proxy failure has to remain recoverable from either
 * path.
 *
 * @param runs - The cache to read and write.
 * @param address - The wallet address the run is keyed by.
 * @param start - Starts the run when nothing is cached.
 * @returns The cached or freshly started run.
 */
function dedupeByAddress<Result>(
  runs: Map<string, Promise<Result>>,
  address: string,
  start: () => Promise<Result>,
): Promise<Result> {
  const key = address.toLowerCase();
  const cached = runs.get(key);
  if (cached) {
    return cached;
  }

  const run = start();
  runs.set(key, run);
  run.catch(() => runs.delete(key));
  return run;
}

/**
 * Registers `address` as the Money Account wallet, at most once per address.
 *
 * @param address - Monad Money Account address to register.
 * @returns The registration result, shared with any concurrent caller.
 */
export async function ensureMoneyAccountWalletRegistered(
  address: string,
): Promise<MoneyAccountWalletRegistrationResult> {
  return await dedupeByAddress(walletRegistrations, address, async () =>
    Engine.context.RampsController.registerMoneyAccountWallet({ address }),
  );
}

/**
 * Creates the demo autoramp paying out to `address`, at most once per address.
 *
 * @param address - The wallet address the autoramp pays out to.
 * @returns The autoramp account, shared with any concurrent caller.
 */
export async function ensureMoneyAccountAutorampCreated(
  address: string,
): Promise<AutorampAccount> {
  return await dedupeByAddress(autoramps, address, async () =>
    Engine.context.RampsController.createAutoramp(
      buildMoneyAccountAutorampParams(address),
    ),
  );
}

/**
 * Clears what has been provisioned this session, so a demo can be re-run
 * against the same wallet from a clean slate.
 */
export function resetMoneyAccountProvisioning(): void {
  walletRegistrations.clear();
  autoramps.clear();
}
