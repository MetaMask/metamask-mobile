import { buildMusdAutorampRequest } from '@metamask/ramps-controller';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import type { VbaSourceCurrency } from '../../../../../util/region/getVbaSourceCurrency';
import { VBA_KYC_VENDOR } from './constants';
import { getVbaVendorTermsAcceptance } from './vbaVendorTermsStorage';

/**
 * `awaiting_provider`: KYC is approved, but the MoonPay customer is not Active
 * for a reason other than unfinished identification or outstanding terms.
 * `identification_required`: MoonPay still needs the customer to finish KYC.
 * `signings_required`: the customer is `SigningsRequired` and the current Iron
 * terms include a document this wallet has not accepted.
 * `terminal`: only Rejected or Cancelled autoramps, and no replacement asked.
 */
export type MusdAutorampSetupOutcome =
  | 'ready'
  | 'waiting'
  | 'awaiting_provider'
  | 'identification_required'
  | 'signings_required'
  | 'failed'
  | 'terminal';

interface AutorampCursor {
  walletAddress: string;
  status: string;
  depositRailsSummary?: { currency?: string };
}

const setupByWallet = new Map<string, Promise<MusdAutorampSetupOutcome>>();
const repostedSignings = new Set<string>();

type SigningResume =
  | 'reposted'
  | 'needs_acceptance'
  | 'identification_required'
  | 'waiting';

/** Clears the in-flight setup guard between tests. */
export const resetMusdAutorampSetupGuard = (): void => {
  setupByWallet.clear();
  repostedSignings.clear();
};

const readExternalCustomerId = (profile: {
  canonicalProfileId?: unknown;
  profileId?: unknown;
}): string | null => {
  const { canonicalProfileId, profileId } = profile;
  if (typeof canonicalProfileId === 'string' && canonicalProfileId.length > 0) {
    return canonicalProfileId;
  }
  return typeof profileId === 'string' && profileId.length > 0
    ? profileId
    : null;
};

const readCustomerStatus = (customer: unknown): string | null => {
  if (!customer || typeof customer !== 'object') {
    return null;
  }
  const { status } = customer as { status?: unknown };
  return typeof status === 'string' && status.length > 0 ? status : null;
};

/**
 * Reads the MoonPay customer lifecycle status for the signed-in profile.
 * `null` when the profile or customer cannot be read.
 *
 * @returns The customer `status`, such as `Active` or `IdentificationRequired`.
 */
export const readMoonpayCustomerStatus = async (): Promise<string | null> => {
  try {
    const profile =
      await Engine.context.AuthenticationController.getSessionProfile();
    const externalId = profile ? readExternalCustomerId(profile) : null;
    if (!externalId) {
      return null;
    }
    return readCustomerStatus(
      await Engine.context.NeoBankService.getCustomerByExternalId(externalId),
    );
  } catch (error) {
    Logger.error(error as Error, {
      tags: { feature: 'vba-onboarding' },
      context: { name: 'readMoonpayCustomerStatus', data: {} },
    });
    return null;
  }
};

/**
 * MoonPay leaves the customer on `SigningsRequired` when accepted Iron terms
 * were never recorded, or when KYC approval asks for those same terms again.
 * Repost documents this wallet already accepted. A document that is not in
 * that set still needs the vendor-terms screen. `IdentificationRequired` means
 * KYC is still unfinished, which is not an account-approval wait.
 */
const resumeMoonpaySignings = async (
  walletAddress: string,
): Promise<SigningResume> => {
  try {
    const status = await readMoonpayCustomerStatus();
    if (status === 'Active') {
      return 'reposted';
    }
    if (status === 'IdentificationRequired') {
      return 'identification_required';
    }
    if (status !== 'SigningsRequired') {
      return 'waiting';
    }

    const kycService = Engine.context.KycService;
    if (!kycService) {
      return 'waiting';
    }
    const country = await kycService.getGeoCountry();
    const disclaimers =
      await Engine.context.KycController.fetchVendorDisclaimers({
        vendor: VBA_KYC_VENDOR,
        country,
      });
    const disclaimerIds = disclaimers
      .map((disclaimer) => disclaimer.id)
      .filter((id) => id.length > 0);
    if (disclaimerIds.length === 0) {
      return 'waiting';
    }

    const accepted = new Set(
      (await getVbaVendorTermsAcceptance(walletAddress))?.disclaimerIds ?? [],
    );
    if (disclaimerIds.some((id) => !accepted.has(id))) {
      return 'needs_acceptance';
    }

    const repostKey = `${walletAddress.toLowerCase()}:${[...disclaimerIds].sort().join(',')}`;
    if (repostedSignings.has(repostKey)) {
      return 'waiting';
    }

    await Engine.context.KycController.recordVendorDisclaimers({
      disclaimerIds,
    });
    repostedSignings.add(repostKey);
    return 'reposted';
  } catch (error) {
    Logger.error(error as Error, {
      tags: { feature: 'vba-onboarding' },
      context: { name: 'resumeMoonpaySignings', data: {} },
    });
    return 'waiting';
  }
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
  let resumedSignings = false;

  for (;;) {
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

    // KYC is approved and MoonPay has not activated the customer yet.
    // `SigningsRequired` is outstanding terms, not a review wait.
    if (
      snapshot.autorampStatus === 'not_ready' &&
      snapshot.kycStatus === 'approved'
    ) {
      if (!resumedSignings) {
        resumedSignings = true;
        const signing = await resumeMoonpaySignings(walletAddress);
        if (signing === 'reposted') {
          continue;
        }
        if (signing === 'needs_acceptance') {
          return 'signings_required';
        }
        if (signing === 'identification_required') {
          return 'identification_required';
        }
      }
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
  }
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
