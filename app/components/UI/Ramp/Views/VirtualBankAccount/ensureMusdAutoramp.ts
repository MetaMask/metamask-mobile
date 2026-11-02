import { buildMusdAutorampRequest } from '@metamask/ramps-controller';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import type { VbaSourceCurrency } from '../../../../../util/region/getVbaSourceCurrency';

/**
 * `awaiting_provider`: KYC is approved, but the MoonPay customer is not Active.
 * `terminal`: only Rejected or Cancelled autoramps, and no replacement asked.
 */
export type MusdAutorampSetupOutcome =
  | 'ready'
  | 'waiting'
  | 'awaiting_provider'
  | 'failed'
  | 'terminal';

interface AutorampCursor {
  walletAddress: string;
  status: string;
  depositRailsSummary?: { currency?: string };
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

const knownCurrency = (autoramp: AutorampCursor): string | undefined =>
  autoramp.depositRailsSummary?.currency;

/**
 * First autoramp for this wallet that is not Rejected or Cancelled.
 * An exact fiat match wins over an earlier autoramp whose fiat is not known
 * yet. An autoramp with no fiat still matches when nothing else does, so a
 * create that has not received deposit rails is not repeated.
 */
export const findUsableAutoramp = <T extends AutorampCursor>(
  autoramps: readonly T[],
  walletAddress: string,
  sourceCurrency?: string,
): T | undefined => {
  const usable = autoramps.filter(
    (autoramp) => isForWallet(autoramp, walletAddress) && !isTerminal(autoramp),
  );
  if (!sourceCurrency) {
    return usable[0];
  }
  return (
    usable.find((autoramp) => knownCurrency(autoramp) === sourceCurrency) ??
    usable.find((autoramp) => !knownCurrency(autoramp))
  );
};

const isTerminalForCurrency = (
  autoramp: AutorampCursor,
  walletAddress: string,
  sourceCurrency: string,
): boolean =>
  isForWallet(autoramp, walletAddress) &&
  isTerminal(autoramp) &&
  knownCurrency(autoramp) === sourceCurrency;

const readAutoramps = (): AutorampCursor[] =>
  Engine.context.RampsController.state?.autoramps ?? [];

const runSetup = async (
  walletAddress: string,
  sourceCurrency: VbaSourceCurrency,
  replaceTerminal: boolean,
): Promise<MusdAutorampSetupOutcome> => {
  if (findUsableAutoramp(readAutoramps(), walletAddress, sourceCurrency)) {
    return 'ready';
  }

  const snapshot = await Engine.context.RampsController.hydrateVbaOnboarding({
    walletAddress,
    refreshKyc: false,
    refreshAutoramps: true,
  });

  if (findUsableAutoramp(readAutoramps(), walletAddress, sourceCurrency)) {
    return 'ready';
  }

  // Hydrate reports ready when any fiat is usable. A different known fiat
  // does not satisfy this request, so create one for the requested currency.
  if (snapshot.autorampStatus === 'ready') {
    await Engine.context.RampsController.createAutoramp(
      buildMusdAutorampRequest(walletAddress, sourceCurrency),
    );
    return 'ready';
  }

  if (
    !replaceTerminal &&
    readAutoramps().some((autoramp) =>
      isTerminalForCurrency(autoramp, walletAddress, sourceCurrency),
    )
  ) {
    return 'terminal';
  }

  // IDOS is approved and MoonPay has not activated the customer yet.
  if (
    snapshot.autorampStatus === 'not_ready' &&
    snapshot.kycStatus === 'approved'
  ) {
    return 'awaiting_provider';
  }

  // KYC is still open, or another read is settling.
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

  if (findUsableAutoramp(readAutoramps(), walletAddress, sourceCurrency)) {
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
