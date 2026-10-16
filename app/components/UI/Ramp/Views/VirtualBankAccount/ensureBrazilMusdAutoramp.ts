import { buildBrazilMusdAutorampRequest } from '@metamask/ramps-controller';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';

export type BrazilMusdAutorampSetupOutcome = 'ready' | 'waiting' | 'failed';

interface AutorampCursor {
  walletAddress: string;
  status: string;
}

const setupByWallet = new Map<
  string,
  Promise<BrazilMusdAutorampSetupOutcome>
>();

/** Clears the in-flight setup guard between tests. */
export const resetBrazilMusdAutorampSetupGuard = (): void => {
  setupByWallet.clear();
};

/** First autoramp for this wallet that is not Rejected or Cancelled. */
export const findUsableAutoramp = <T extends AutorampCursor>(
  autoramps: readonly T[],
  walletAddress: string,
): T | undefined => {
  const normalized = walletAddress.toLowerCase();
  return autoramps.find(
    (autoramp) =>
      autoramp.walletAddress.toLowerCase() === normalized &&
      autoramp.status !== 'Rejected' &&
      autoramp.status !== 'Cancelled',
  );
};

const readAutoramps = (): AutorampCursor[] =>
  Engine.context.RampsController.state?.autoramps ?? [];

const runSetup = async (
  walletAddress: string,
): Promise<BrazilMusdAutorampSetupOutcome> => {
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
    buildBrazilMusdAutorampRequest(walletAddress),
  );
  return 'ready';
};

/**
 * Registers the wallet when needed, then creates the BRL autoramp. Overlapping
 * calls for the same wallet share one run.
 */
export const ensureBrazilMusdAutoramp = (
  walletAddress: string,
): Promise<BrazilMusdAutorampSetupOutcome> => {
  const inFlight = setupByWallet.get(walletAddress);
  if (inFlight) {
    return inFlight;
  }

  const run = runSetup(walletAddress)
    .catch((error: unknown) => {
      Logger.error(error as Error, {
        tags: { feature: 'vba-onboarding' },
        context: { name: 'ensureBrazilMusdAutoramp' },
      });
      return 'failed' as const;
    })
    .finally(() => {
      if (setupByWallet.get(walletAddress) === run) {
        setupByWallet.delete(walletAddress);
      }
    });

  setupByWallet.set(walletAddress, run);
  return run;
};
