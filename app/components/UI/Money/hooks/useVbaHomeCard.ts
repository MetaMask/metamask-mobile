import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import {
  AutorampStatus,
  type AutorampAccount,
  type MoneyAccountWalletRegistration,
} from '@metamask/ramps-controller';
import type {
  KycProviderFlowStatus,
  KycSessionStatus,
} from '@metamask/kyc-controller';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import type { RootState } from '../../../../reducers';
import {
  selectKycProviderFlowStatus,
  selectKycSessionStatus,
} from '../../../../selectors/kycController';
import {
  selectRampsControllerState,
  selectSelectedVbaWalletAddress,
} from '../../../../selectors/rampsController';
import { useVbaEligibility } from '../../Ramp/Views/VirtualBankAccount/hooks/useVbaEligibility';
import { hasAcceptedVbaVendorTerms } from '../../Ramp/Views/VirtualBankAccount/vbaVendorTermsStorage';

/**
 * Identity of the single VBA status card Money home renders, if any. The hook
 * names no destination and renders nothing; hosts map each variant onto
 * Figma. At most one card is returned for a user who has started identity
 * verification.
 */
export type VbaHomeCard =
  /** No card: not eligible, account already usable, or nothing fits. */
  | { type: 'none' }
  /** GET_STARTED — Figma node 2267-17522. */
  | { type: 'get_started' }
  /** ACCOUNT_IS_READY — Figma node 2158-5306. */
  | { type: 'account_is_ready' }
  /** KYC_PENDING — Figma node 2254-13372. */
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
 * Pure decision resolving the single VBA status card for Money home. Mirrors
 * George Weiler's decision order from TRAM-4099 (first match wins), which in
 * turn mirrors the controller's own `resolveVbaKycStatus` /
 * `#hasUsableAutorampForWallet` semantics — do not reinvent them here.
 *
 * The approved check is `finalStatus === 'approved' || kycStatus === 'approved'`
 * (relay approval counts while the vendor `finalStatus` is still pending).
 *
 * Rules 1–2 (none) and 3 (get_started) short-circuit before the session
 * rules, so an approved session always reaches rule 4 and a fresh user
 * without any evidence always reaches rule 3. Anything left after rule 7
 * (for example a wallet whose only autoramp is dead, with no session, terms,
 * or registration) renders no card — reinstall discovery is a follow-up.
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

  // 2. A usable autoramp means the account is ready to use.
  if (hasUsableAutorampForWallet(walletAddress, autoramps)) {
    return { type: 'none' };
  }

  // 3. Brand-new user: nothing started and no evidence of prior setup.
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

  // 4. KYC approved and no usable autoramp (rule 2 removed usable routes) —
  // finish setting the account up.
  if (isApproved) {
    return { type: 'account_is_ready' };
  }

  // 5. KYC rejected or retry — no card exists in Figma yet (design question
  // pending in TRAM-4099). Stub: hosts render this as `none` for now.
  if (
    sessionStatus?.finalStatus === 'rejected' ||
    sessionStatus?.finalStatus === 'retry'
  ) {
    return { type: 'kyc_decision' };
  }

  // 6. Vendor still processing, or the provider flow was submitted.
  // Note rule 3 above: an incomplete session (terms accepted or not) lands in
  // rule 7 instead; submitted-but-new reaches this rule.
  if (
    sessionStatus?.finalStatus === 'pending' ||
    sessionStatus?.kycStatus === 'pending' ||
    providerFlowStatus === 'submitted'
  ) {
    return { type: 'kyc_pending' };
  }

  // 7. Started but incomplete: terms accepted, or a live (non-terminal)
  // session. Submitted provider flows already returned in rule 6.
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
 * Source of truth for the single VBA identity-status card on Money home.
 * Reads Redux only — no navigation, no UI, and no network on load.
 *
 * The local vendor-terms acceptance lives in async storage, not Redux; it is
 * read on mount (and per wallet change) and treated as not accepted while
 * loading.
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
    let cancelled = false;
    // Treat as not accepted while the read is in flight.
    setHasAcceptedVendorTerms(false);
    if (!walletAddress) {
      return undefined;
    }
    hasAcceptedVbaVendorTerms(walletAddress)
      .then((accepted) => {
        if (!cancelled) {
          setHasAcceptedVendorTerms(accepted);
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
      cancelled = true;
    };
  }, [walletAddress]);

  return useMemo(
    () =>
      getVbaHomeCard({
        isEligible,
        isEligibilityLoading,
        walletAddress,
        sessionStatus,
        providerFlowStatus,
        hasAcceptedVendorTerms,
        autoramps,
        walletRegistrations,
      }),
    [
      isEligible,
      isEligibilityLoading,
      walletAddress,
      sessionStatus,
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
 * non-terminal, matching `hydrateVbaOnboarding`'s own `refreshKyc` gate
 * (one session-status GET for a non-terminal persisted session). With no
 * session, or a terminal one, there is nothing to refresh.
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
 * (MoneyHomeView) so it runs on `useFocusEffect`: when a KYC session exists
 * and is non-terminal, it calls
 * `RampsController.hydrateVbaOnboarding({ walletAddress, refreshKyc: true })`
 * — a single GET, never `refreshSessionStatus` and never the 15s poll. With
 * no session or a terminal status it does nothing. The gate reads only
 * primitive state (`walletAddress`, `finalStatus`), so unrelated
 * KycController state writes never re-arm the refresh mid-focus, and
 * `hydrateVbaOnboarding` is never called during initial render.
 */
export const useVbaHomeCardRefresh = (): void => {
  const walletAddress = useSelector(selectSelectedVbaWalletAddress);
  const sessionFinalStatus = useSelector(selectKycSessionStatus)?.finalStatus;

  useFocusEffect(
    useCallback(() => {
      if (
        !walletAddress ||
        !shouldRefreshKycSessionOnFocus(sessionFinalStatus ?? null)
      ) {
        return undefined;
      }
      Engine.context.RampsController.hydrateVbaOnboarding({
        walletAddress,
        refreshKyc: true,
      }).catch((error) => {
        Logger.error(error as Error, {
          tags: { feature: 'money-home' },
          context: {
            name: 'useVbaHomeCardRefresh',
            data: { walletAddress },
          },
        });
      });
      return undefined;
    }, [walletAddress, sessionFinalStatus]),
  );
};
