import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { useNetworkTier } from '../../../../../../hooks/useNetworkTier';
import {
  AutorampStatus,
  type AutorampAccount,
  type MoneyAccountWalletRegistration,
} from '@metamask/ramps-controller';
import type {
  KycProviderFlowStatus,
  KycSessionStatus,
} from '@metamask/kyc-controller';
import Engine from '../../../../../../core/Engine';
import Logger from '../../../../../../util/Logger';
import type { RootState } from '../../../../../../reducers';
import {
  selectKycProviderFlowStatus,
  selectKycSessionStatus,
} from '../../../../../../selectors/kycController';
import {
  selectRampsControllerState,
  selectSelectedVbaWalletAddress,
} from '../../../../../../selectors/rampsController';
import { useVbaEligibility } from './useVbaEligibility';
import { hasAcceptedVbaVendorTerms } from '../vbaVendorTermsStorage';
import { getVbaKycStatusOverride } from '../vbaDevOverrides';

/**
 * Identity of the single VBA status card Money home renders, if any. The hook
 * names no destination and renders nothing; hosts map each variant onto
 * Figma. At most one card is returned for a user who has started identity
 * verification.
 */
export type VbaHomeCard =
  /** No card: not eligible, no wallet, or nothing fits. */
  | { type: 'none' }
  /** GET_STARTED — Figma node 2267-17522. */
  | { type: 'get_started' }
  /** ACCOUNT_IS_READY — Figma node 2158-5306. KYC approved with a usable autoramp. */
  | { type: 'account_is_ready' }
  /**
   * KYC_PENDING — Figma node 2254-13372. Vendor still processing, flow
   * submitted, or approved but provisioning has not produced a usable
   * autoramp yet.
   */
  | { type: 'kyc_pending' }
  /** FINISH_VERIFICATION — Figma node 2267-18364. */
  | { type: 'finish_verification' }
  /**
   * KYC rejected or retry — stub. No card exists in Figma for this state yet
   * (design question pending in TRAM-4099); hosts render it as `none` until
   * design answers.
   */
  | { type: 'kyc_decision' };

/** Inputs for {@link getVbaHomeCard}. */
export interface VbaHomeCardInputs {
  /** VBA eligibility resolved ({@link VbaEligibility.isEligible}). */
  isEligible: boolean;
  /** VBA eligibility is still resolving ({@link VbaEligibility.isLoading}). */
  isEligibilityLoading: boolean;
  /** Selected Money account wallet address, or `null` when there is none. */
  walletAddress: string | null;
  /** Persisted KYC session status from KycController state, or `null`. */
  sessionStatus: KycSessionStatus | null;
  /** Durable identity-provider flow outcome from KycController state. */
  providerFlowStatus: KycProviderFlowStatus;
  /**
   * Whether the wallet accepted the local vendor terms (async storage, not
   * Redux). Treated as `false` while the read is in flight.
   */
  hasAcceptedVendorTerms: boolean;
  /** RampsController autoramp cursor. */
  autoramps: readonly AutorampAccount[];
  /** RampsController Money Account wallet registrations. */
  walletRegistrations: readonly MoneyAccountWalletRegistration[];
}

/**
 * `KycSessionStatus.finalStatus` values that end KYC session-status polling.
 * Mirrors `TERMINAL_SESSION_STATUSES` from `@metamask/kyc-controller` 0.7.0,
 * which is not re-exported from the package index. The doc comment on
 * `KycSessionStatus.finalStatus` listing completed/failed/blocked is stale —
 * these three are the authoritative terminal values.
 */
const TERMINAL_SESSION_STATUSES = new Set(['approved', 'rejected', 'retry']);

/** Stable empty fallback for the RampsController autoramp cursor. */
const EMPTY_AUTORAMPS: readonly AutorampAccount[] = [];

/** Stable empty fallback for the wallet registration list. */
const EMPTY_WALLET_REGISTRATIONS: readonly MoneyAccountWalletRegistration[] =
  [];

/**
 * Case-insensitive wallet match, mirroring how `RampsController` scopes
 * autoramps and registrations to a wallet (`walletAddress.trim().toLowerCase()`).
 */
const matchesWallet = (walletAddress: string, candidate: string): boolean =>
  candidate.toLowerCase() === walletAddress.trim().toLowerCase();

/**
 * Whether the wallet has an autoramp that is not `Rejected` or `Cancelled`.
 * Mirrors `RampsController`'s private `#hasUsableAutorampForWallet`.
 */
const hasUsableAutorampForWallet = (
  walletAddress: string,
  autoramps: readonly AutorampAccount[],
): boolean =>
  autoramps.some(
    (autoramp) =>
      matchesWallet(walletAddress, autoramp.walletAddress) &&
      autoramp.status !== AutorampStatus.Rejected &&
      autoramp.status !== AutorampStatus.Cancelled,
  );

/** Whether the wallet has any autoramp row, including dead routes. */
const hasAnyAutorampForWallet = (
  walletAddress: string,
  autoramps: readonly AutorampAccount[],
): boolean =>
  autoramps.some((autoramp) =>
    matchesWallet(walletAddress, autoramp.walletAddress),
  );

/**
 * Whether the wallet has a Money Account registration row. A `disabled` row
 * still counts as registration evidence.
 */
const hasWalletRegistration = (
  walletAddress: string,
  walletRegistrations: readonly MoneyAccountWalletRegistration[],
): boolean =>
  walletRegistrations.some((registration) =>
    matchesWallet(walletAddress, registration.walletAddress),
  );

/**
 * Pure decision resolving the single VBA status card for Money home. For the
 * approved states it mirrors the onboarding funnel's own destination logic
 * (`getVbaDestinationForSnapshot`: approved + ready route → complete,
 * approved + route missing → still provisioning) and the controller's
 * `#hasUsableAutorampForWallet` semantics — do not reinvent them here.
 *
 * TRAM-4079: the original TRAM-4099 order returned `none` whenever a usable
 * autoramp existed and showed `account_is_ready` only while it was still
 * missing — the exact inverse of the card's copy ("You're all set", view the
 * Pix details) and of the funnel. Rule 3 now keys the card off the usable
 * autoramp.
 *
 * The approved check is `finalStatus === 'approved' || kycStatus === 'approved'`
 * (relay approval counts while the vendor `finalStatus` is still pending).
 *
 * Rules 1–2 (none and get_started) short-circuit before the session rules, so
 * an approved session always reaches rule 3 and a fresh user without any
 * evidence always reaches rule 2. Anything left after rule 6 (for example a
 * wallet whose only autoramp is dead, with no session, terms, or
 * registration) renders no card — reinstall discovery is a follow-up.
 *
 * @returns The card identity. `{ type: 'kyc_decision' }` is a stub that hosts
 * render as `none` until the rejected/retry design lands.
 */
export function getVbaHomeCard({
  isEligible,
  isEligibilityLoading,
  walletAddress,
  sessionStatus,
  providerFlowStatus,
  hasAcceptedVendorTerms,
  autoramps,
  walletRegistrations,
}: VbaHomeCardInputs): VbaHomeCard {
  // Not eligible, or the geo lookup has not resolved yet — hold.
  if (!isEligible || isEligibilityLoading) {
    return { type: 'none' };
  }

  // 1. Nothing to hang a card on without a Money account wallet.
  if (!walletAddress) {
    return { type: 'none' };
  }

  // 2. Brand-new user: nothing started and no evidence of prior setup.
  if (
    !hasAcceptedVendorTerms &&
    !sessionStatus &&
    !hasAnyAutorampForWallet(walletAddress, autoramps) &&
    !hasWalletRegistration(walletAddress, walletRegistrations)
  ) {
    return { type: 'get_started' };
  }

  const isApproved =
    sessionStatus?.finalStatus === 'approved' ||
    sessionStatus?.kycStatus === 'approved';

  // 3. KYC approved. A usable autoramp means the virtual account details are
  // ready — show the account_is_ready card ("You're all set" / view the Pix
  // details). Without one, provisioning is still running: kyc_pending,
  // mirroring the onboarding funnel's `kycPending` destination for an approved
  // session whose route is not ready yet.
  if (isApproved) {
    return hasUsableAutorampForWallet(walletAddress, autoramps)
      ? { type: 'account_is_ready' }
      : { type: 'kyc_pending' };
  }

  // 4. KYC rejected or retry — no card exists in Figma yet (design question
  // pending in TRAM-4099). Stub: hosts render this as `none` for now.
  if (
    sessionStatus?.finalStatus === 'rejected' ||
    sessionStatus?.finalStatus === 'retry'
  ) {
    return { type: 'kyc_decision' };
  }

  // 5. Genuinely in review: the relay decision is pending, or the provider
  // flow was submitted. `finalStatus === 'pending'` alone does NOT mean
  // review — an abandoned flow keeps `finalStatus: 'pending'` with
  // `kycStatus: 'new'` (observed on device), and must fall through to rule 6
  // so the user finishes verification instead of seeing a spinner.
  if (
    sessionStatus?.kycStatus === 'pending' ||
    providerFlowStatus === 'submitted'
  ) {
    return { type: 'kyc_pending' };
  }

  // 6. Started but incomplete: terms accepted, or a live (non-terminal)
  // session. Submitted provider flows already returned in rule 5.
  if (
    hasAcceptedVendorTerms ||
    (sessionStatus && !TERMINAL_SESSION_STATUSES.has(sessionStatus.finalStatus))
  ) {
    return { type: 'finish_verification' };
  }

  // Every rule was exhausted without a match (for example a wallet whose only
  // autoramp is Rejected/Cancelled, with no session, terms, or registration).
  // No card fits; render nothing.
  return { type: 'none' };
}

/**
 * Reads local vendor-terms acceptance for `walletAddress` and reports the
 * result unless the caller has already cancelled.
 *
 * @param walletAddress - Wallet the acceptance was stored under.
 * @param onAccepted - Receives whether that wallet has accepted terms.
 * @returns Cleanup that ignores a late resolution.
 */
const readVendorTermsAcceptance = (
  walletAddress: string,
  onAccepted: (accepted: boolean) => void,
): (() => void) => {
  let isCancelled = false;
  hasAcceptedVbaVendorTerms(walletAddress)
    .then((accepted) => {
      if (!isCancelled) {
        onAccepted(accepted);
      }
    })
    .catch((error) => {
      Logger.error(error as Error, {
        tags: { feature: 'money-home' },
        context: {
          name: 'useVbaHomeCard',
          data: { step: 'hasAcceptedVbaVendorTerms' },
        },
      });
    });
  return () => {
    isCancelled = true;
  };
};

/**
 * Source of truth for the single VBA identity-status card on Money home.
 * Reads Redux only — no navigation, no UI, and no network on load.
 *
 * The local vendor-terms acceptance lives in async storage, not Redux. It is
 * read on mount and on wallet change, and treated as not accepted while that
 * read is in flight.
 *
 * @example
 * const card = useVbaHomeCard();
 * if (card.type === 'kyc_pending') {
 *   // render the KYC pending card
 * }
 */
export const useVbaHomeCard = (): VbaHomeCard => {
  const { isEligible, isLoading: isEligibilityLoading } = useVbaEligibility();
  const walletAddress = useSelector(selectSelectedVbaWalletAddress);
  const sessionStatus = useSelector(selectKycSessionStatus);
  const providerFlowStatus = useSelector(selectKycProviderFlowStatus);
  // Dev-only demo override: honor MM_MONEY_VBA_KYC_STATUS_OVERRIDE for the
  // home card the same way onboarding does (applyVbaDevOverrides), so demos
  // can force the rejected state without vendor-side changes. No-op when the
  // env var is unset, in production builds, or without a stored session.
  const kycStatusOverride = getVbaKycStatusOverride();
  // Memoized so the card memo below sees a stable reference: without it, the
  // dev-override spread would build a new object every render.
  const effectiveSessionStatus = useMemo(
    () =>
      kycStatusOverride && sessionStatus
        ? {
            ...sessionStatus,
            finalStatus: kycStatusOverride,
            kycStatus: kycStatusOverride,
          }
        : sessionStatus,
    [kycStatusOverride, sessionStatus],
  );
  const autoramps = useSelector((state: RootState) => {
    const rampsControllerState = selectRampsControllerState(state);
    return rampsControllerState?.autoramps ?? EMPTY_AUTORAMPS;
  });
  const walletRegistrations = useSelector((state: RootState) => {
    const rampsControllerState = selectRampsControllerState(state);
    return (
      rampsControllerState?.moneyAccountWalletRegistrations ??
      EMPTY_WALLET_REGISTRATIONS
    );
  });

  const [hasAcceptedVendorTerms, setHasAcceptedVendorTerms] = useState(false);
  // Tracks the wallet the acceptance value was read for, so a wallet switch
  // resets to not accepted during the render itself (not one frame later in
  // an effect) and the first render for a new wallet never sees the
  // previous wallet's value.
  const [termsWalletAddress, setTermsWalletAddress] = useState(walletAddress);
  if (termsWalletAddress !== walletAddress) {
    setTermsWalletAddress(walletAddress);
    setHasAcceptedVendorTerms(false);
  }

  useEffect(() => {
    // Treat as not accepted while the first read for this wallet is in flight.
    setHasAcceptedVendorTerms(false);
    if (!walletAddress) {
      return undefined;
    }
    return readVendorTermsAcceptance(walletAddress, setHasAcceptedVendorTerms);
  }, [walletAddress]);

  return useMemo(
    () =>
      getVbaHomeCard({
        isEligible,
        isEligibilityLoading,
        walletAddress,
        sessionStatus: effectiveSessionStatus,
        providerFlowStatus,
        hasAcceptedVendorTerms,
        autoramps,
        walletRegistrations,
      }),
    [
      isEligible,
      isEligibilityLoading,
      walletAddress,
      effectiveSessionStatus,
      providerFlowStatus,
      hasAcceptedVendorTerms,
      autoramps,
      walletRegistrations,
    ],
  );
};

/**
 * Whether focusing Money home should trigger the one-shot KYC session
 * refresh: a KYC session must exist and its `finalStatus` must be
 * non-terminal — the same terminal-status gate the KYC 15s poll uses to
 * decide whether to keep ticking. With no session, or a terminal one, there
 * is nothing to refresh.
 *
 * @param sessionFinalStatus - `KycSessionStatus.finalStatus` when a session
 * is persisted, else `null`.
 * @returns Whether the focus refresh should run.
 */
export const shouldRefreshKycSessionOnFocus = (
  sessionFinalStatus: string | null,
): boolean =>
  sessionFinalStatus !== null &&
  !TERMINAL_SESSION_STATUSES.has(sessionFinalStatus);

/**
 * One-shot KYC session refresh for Money home. Wire it on the hosting screen
 * (MoneyHomeView) so it runs on `useFocusEffect` for an eligible user with a
 * selected Money wallet and a persisted session whose `finalStatus` is not
 * terminal: it calls `KycController.fetchSessionStatusOnce(sessionId)` — a
 * single GET, never `refreshSessionStatus`, never the 15s poll, and never
 * `hydrateVbaOnboarding`, whose disclaimers, consent, and vendor-customer
 * lookups the card does not need. When that fetch returns `approved` and this
 * wallet has no usable autoramp, one autoramp-list refresh
 * (`RampsController.refreshAutoramps`) catches up on statuses missed while no
 * process was polling. It never signs and never creates an autoramp. With no
 * wallet, an ineligible user, a known-offline network, or a terminal status,
 * it does nothing. The gate reads only primitive state, so unrelated
 * KycController state writes never re-arm the refresh mid-focus, and no
 * request is made during initial render.
 */
export const useVbaHomeCardRefresh = (): void => {
  const { isEligible } = useVbaEligibility();
  // Device-capability matrix: every hardware tier skips network work on a
  // known-offline network; `null` (unknown) takes the product default.
  const networkTier = useNetworkTier();
  const walletAddress = useSelector(selectSelectedVbaWalletAddress);
  const sessionStatus = useSelector(selectKycSessionStatus);
  const sessionId = sessionStatus?.id;
  const sessionFinalStatus = sessionStatus?.finalStatus;

  useFocusEffect(
    useCallback(() => {
      if (!isEligible || !walletAddress || networkTier === 'NONE') {
        return undefined;
      }
      if (
        !sessionId ||
        !shouldRefreshKycSessionOnFocus(sessionFinalStatus ?? null)
      ) {
        return undefined;
      }

      Engine.context.KycController.fetchSessionStatusOnce(sessionId)
        .then((status) => {
          if (status.finalStatus !== 'approved') {
            return undefined;
          }
          const { autoramps } = Engine.context.RampsController.state;
          if (hasUsableAutorampForWallet(walletAddress, autoramps)) {
            return undefined;
          }
          return Engine.context.RampsController.refreshAutoramps();
        })
        .catch((error) => {
          Logger.error(error as Error, {
            tags: { feature: 'money-home' },
            context: {
              name: 'useVbaHomeCardRefresh',
              data: { walletAddress },
            },
          });
        });
      return undefined;
    }, [isEligible, networkTier, walletAddress, sessionId, sessionFinalStatus]),
  );
};
