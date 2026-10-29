import { buildMusdAutorampRequest } from '@metamask/ramps-controller';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import { findUsableVbaAutoramp } from '../../../../../selectors/rampsController';
import { TraceName } from '../../../../../util/trace';
import type { VbaSourceCurrency } from '../../../../../util/region/getVbaSourceCurrency';
import {
  AccountCreateRegistrationError,
  getAccountCreateFiatFailureResult,
  getAccountCreateResultFromError,
  getAccountCreateResultFromResponse,
} from './accountCreateError';
import { endVbaCufChildTrace, startVbaCufChildTrace } from './vbaCufTrace';
import { VBA_CUF_END_REASON } from './vbaCufTags';

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

const isAccountCreateFailure = (autoramp: AutorampCursor) =>
  getAccountCreateFiatFailureResult(autoramp.status) !== null;

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
    (autoramp) =>
      isForWallet(autoramp, walletAddress) &&
      !isTerminal(autoramp) &&
      !isAccountCreateFailure(autoramp),
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

const throwExistingAccountCreateFailure = (
  autoramps: readonly AutorampCursor[],
  walletAddress: string,
  sourceCurrency: VbaSourceCurrency,
): void => {
  const failedAutoramps = autoramps.filter(
    (autoramp) =>
      isForWallet(autoramp, walletAddress) && isAccountCreateFailure(autoramp),
  );
  const failedAutoramp = failedAutoramps.find(
    (autoramp) => knownCurrency(autoramp) === sourceCurrency,
  );
  const result = getAccountCreateFiatFailureResult(failedAutoramp?.status);
  if (result) {
    throw new AccountCreateRegistrationError(result);
  }
};

const createAutoramp = async (
  walletAddress: string,
  sourceCurrency: VbaSourceCurrency,
): Promise<void> => {
  try {
    const response = await Engine.context.RampsController.createAutoramp(
      buildMusdAutorampRequest(walletAddress, sourceCurrency),
    );
    const result = getAccountCreateResultFromResponse(response);
    if (
      result?.kind === 'fiat' &&
      (result.status === 'AuthorizationFailed' ||
        result.status === 'RegistrationFailed')
    ) {
      throw new AccountCreateRegistrationError(result);
    }
  } catch (error) {
    if (error instanceof AccountCreateRegistrationError) {
      throw error;
    }
    throw new AccountCreateRegistrationError(
      getAccountCreateResultFromError(error),
    );
  }
};

const runSetup = async (
  walletAddress: string,
  sourceCurrency: VbaSourceCurrency,
  replaceTerminal: boolean,
): Promise<MusdAutorampSetupOutcome> => {
  throwExistingAccountCreateFailure(
    readAutoramps(),
    walletAddress,
    sourceCurrency,
  );
  if (findUsableAutoramp(readAutoramps(), walletAddress, sourceCurrency)) {
    return 'ready';
  }

  const snapshot = await Engine.context.RampsController.hydrateVbaOnboarding({
    walletAddress,
    refreshKyc: false,
    refreshAutoramps: true,
  });

  throwExistingAccountCreateFailure(
    readAutoramps(),
    walletAddress,
    sourceCurrency,
  );
  // Any currency counts, so a second one is never created on the Money account.
  if (findUsableVbaAutoramp(readAutoramps(), walletAddress)) {
    return 'ready';
  }

  if (snapshot.autorampStatus === 'ready') {
    await createAutoramp(walletAddress, sourceCurrency);
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
    const registration = await (async () => {
      try {
        return await Engine.context.RampsController.registerMoneyAccountWallet({
          address: walletAddress,
        });
      } catch (error) {
        throw new AccountCreateRegistrationError(
          getAccountCreateResultFromError(error),
        );
      }
    })();
    if (registration.type === 'lookupUnavailable') {
      throw new AccountCreateRegistrationError(
        getAccountCreateResultFromError(registration.error),
      );
    }
  } else if (snapshot.autorampStatus !== 'needs_source_currency') {
    return 'waiting';
  }

  throwExistingAccountCreateFailure(
    readAutoramps(),
    walletAddress,
    sourceCurrency,
  );
  if (findUsableVbaAutoramp(readAutoramps(), walletAddress)) {
    return 'ready';
  }

  await createAutoramp(walletAddress, sourceCurrency);
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

  const setupTraceId = startVbaCufChildTrace(TraceName.VbaAutorampSetup);
  const run = runSetup(walletAddress, sourceCurrency, replaceTerminal)
    .then((outcome) => {
      endVbaCufChildTrace(
        setupTraceId,
        outcome !== 'failed',
        outcome === 'failed' ? VBA_CUF_END_REASON.ERROR : undefined,
      );
      return outcome;
    })
    .catch((error: unknown) => {
      endVbaCufChildTrace(setupTraceId, false, VBA_CUF_END_REASON.ERROR);
      if (error instanceof AccountCreateRegistrationError) {
        throw error;
      }
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
