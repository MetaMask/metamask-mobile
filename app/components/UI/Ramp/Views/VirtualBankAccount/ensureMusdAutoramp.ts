import { buildMusdAutorampRequest } from '@metamask/ramps-controller';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import type { VbaSourceCurrency } from '../../../../../util/region/getVbaSourceCurrency';

/** `terminal`: only Rejected or Cancelled autoramps, and no replacement asked. */
export type MusdAutorampSetupOutcome =
  | 'ready'
  | 'waiting'
  | 'failed'
  | 'terminal';

interface AutorampCursor {
  walletAddress: string;
  status: string;
}

const setupByWallet = new Map<string, Promise<MusdAutorampSetupOutcome>>();

/** Clears the in-flight setup guard between tests. */
export const resetMusdAutorampSetupGuard = (): void => {
  setupByWallet.clear();
};

const isForWallet = (autoramp: AutorampCursor, walletAddress: string) =>
  autoramp.walletAddress.toLowerCase() === walletAddress.toLowerCase();

const isTerminal = (autoramp: AutorampCursor) =>
  autoramp.status === 'Rejected' || autoramp.status === 'Cancelled';

/** First autoramp for this wallet that is not Rejected or Cancelled. */
export const findUsableAutoramp = <T extends AutorampCursor>(
  autoramps: readonly T[],
  walletAddress: string,
): T | undefined =>
  autoramps.find(
    (autoramp) => isForWallet(autoramp, walletAddress) && !isTerminal(autoramp),
  );

const readAutoramps = (): AutorampCursor[] =>
  Engine.context.RampsController.state?.autoramps ?? [];

const runSetup = async (
  walletAddress: string,
  sourceCurrency: VbaSourceCurrency,
  replaceTerminal: boolean,
): Promise<MusdAutorampSetupOutcome> => {
  if (findUsableAutoramp(readAutoramps(), walletAddress)) {
    return 'ready';
  }

  const snapshot = await Engine.context.RampsController.hydrateVbaOnboarding({
    walletAddress,
    refreshKyc: false,
    refreshAutoramps: true,
  });

  if (
    findUsableAutoramp(readAutoramps(), walletAddress) ||
    snapshot.autorampStatus === 'ready'
  ) {
    return 'ready';
  }

  if (
    !replaceTerminal &&
    readAutoramps().some(
      (autoramp) =>
        isForWallet(autoramp, walletAddress) && isTerminal(autoramp),
    )
  ) {
    return 'terminal';
  }

  // Customer not Active yet, or another read is still settling.
  if (
    snapshot.autorampStatus === 'not_ready' ||
    snapshot.autorampStatus === 'in_progress'
  ) {
    return 'waiting';
  }

  if (snapshot.autorampStatus === 'retryable_failure') {
    return 'failed';
  }

  if (snapshot.autorampStatus === 'needs_wallet_registration') {
    const registration =
      await Engine.context.RampsController.registerMoneyAccountWallet({
        address: walletAddress,
      });
    if (registration.type === 'lookupUnavailable') {
      return 'failed';
    }
  } else if (snapshot.autorampStatus !== 'needs_source_currency') {
    return 'waiting';
  }

  if (findUsableAutoramp(readAutoramps(), walletAddress)) {
    return 'ready';
  }

  await Engine.context.RampsController.createAutoramp(
    buildMusdAutorampRequest(walletAddress, sourceCurrency),
  );
  return 'ready';
};

/**
 * Registers the wallet when needed, then creates the fiat autoramp. Overlapping
 * calls for the same wallet and currency share one run. Rejected or Cancelled
 * autoramps are only replaced when `replaceTerminal` is set (Retry).
 */
export const ensureMusdAutoramp = (
  walletAddress: string,
  sourceCurrency: VbaSourceCurrency,
  { replaceTerminal = false }: { replaceTerminal?: boolean } = {},
): Promise<MusdAutorampSetupOutcome> => {
  const key = `${walletAddress.toLowerCase()}:${sourceCurrency}`;
  const inFlight = setupByWallet.get(key);
  if (inFlight) {
    return inFlight;
  }

  const run = runSetup(walletAddress, sourceCurrency, replaceTerminal)
    .catch((error: unknown) => {
      Logger.error(error as Error, {
        tags: { feature: 'vba-onboarding' },
        context: { name: 'ensureMusdAutoramp', data: { sourceCurrency } },
      });
      return 'failed' as const;
    })
    .finally(() => {
      if (setupByWallet.get(key) === run) {
        setupByWallet.delete(key);
      }
    });

  setupByWallet.set(key, run);
  return run;
};
