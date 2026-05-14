import React, { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { CaipChainId } from '@metamask/utils';

import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../util/navigation/navUtils';
import { useStyles } from '../../../../hooks/useStyles';
import Logger from '../../../../../util/Logger';

// Imported from concrete files instead of `../../headless` to avoid a
// circular import: `../../headless/index.ts` re-exports `useHeadlessBuy`,
// which in turn imports this Host (for `createHeadlessHostNavDetails`).
// Going through the barrel would leave the registry exports `undefined`
// at evaluation time inside this module.
import {
  closeSession,
  failSession,
  getSession,
  setStatus,
} from '../../headless/sessionRegistry';
import { setHeadlessEntryCardTouchThrough } from '../../headless/headlessEntryNavigation';
import { useHeadlessSessionDismissal } from '../../headless/useHeadlessSessionDismissal';
import { getChainIdFromAssetId } from '../../headless/useHeadlessBuy';
import useContinueWithQuote, {
  type ContinueWithQuoteContext,
} from '../../hooks/useContinueWithQuote';
import useRampAccountAddress from '../../hooks/useRampAccountAddress';
import { useRampsUserRegion } from '../../hooks/useRampsUserRegion';
import { useRampsPaymentMethods } from '../../hooks/useRampsPaymentMethods';
import { getQuoteProviderName } from '../../types';

import styleSheet from './HeadlessHost.styles';

/**
 * Test-only anchor for the Host's transparent placeholder. The Host renders
 * no user-visible chrome after Phase 9.5 — every loading / error / cancel
 * surface is owned by the consumer (MetaMask Pay's `TransactionPayController`).
 */
export const HEADLESS_HOST_CONTAINER_TEST_ID = 'headless-host-container';

export interface HeadlessHostParams {
  /** Session id created by `useHeadlessBuy().startHeadlessBuy(...)`. */
  headlessSessionId: string;
  /**
   * When the OTP/auth loop fails, OtpCode resets back to this Host with
   * `nativeFlowError` set. The Host turns it into an
   * `onError('AUTH_FAILED', ...)` callback for the headless consumer and
   * then closes the session.
   */
  nativeFlowError?: string;
}

/**
 * Navigation helper for jumping to the Headless Host screen. The Host is
 * the stack base for the headless buy flow — `useTransakRouting` resets
 * land back here so post-auth navigation has somewhere to root.
 */
export const createHeadlessHostNavDetails =
  createNavigationDetails<HeadlessHostParams>(Routes.RAMP.HEADLESS_HOST);

/**
 * Headless Host screen.
 *
 * After Phase 9.5 the Host is intentionally **invisible** — it renders a
 * transparent placeholder so React Navigation has a stack base for resets,
 * but the consumer (TPC / MMPay) renders the only user-visible loading UI
 * for a headless buy. The Host still picks up the live session by
 * `headlessSessionId` and calls `useContinueWithQuote().continueWithQuote(...)`
 * exactly once on mount (status guard prevents re-entry on the post-OTP auth
 * loop), surfaces `nativeFlowError` (set by OtpCode on routing failure) as
 * `onError('AUTH_FAILED', ...)` and closes the session, and fires
 * `onClose({ reason: 'user_dismissed' })` from two paths.
 *
 * Dismissal: `navigation.addListener('beforeRemove', ...)` catches synchronous
 * user-driven pops of the Host itself (hardware back / iOS swipe-back when the
 * Host is the focused screen, or a programmatic pop targeting it).
 * `useHeadlessSessionDismissal` (Phase 8) catches any other unmount path:
 * stack resets that bypass `beforeRemove`, hot reloads, parent navigator
 * pops, etc. `closeSession` is idempotent so the two are safe to coexist.
 */
function HeadlessHost() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { styles } = useStyles(styleSheet, {});
  const { headlessSessionId, nativeFlowError } =
    useParams<HeadlessHostParams>();
  const session = getSession(headlessSessionId);

  useEffect(() => {
    setHeadlessEntryCardTouchThrough(navigation, isFocused);

    return () => {
      setHeadlessEntryCardTouchThrough(navigation, false);
    };
  }, [navigation, isFocused]);

  // Phase 8: defense-in-depth dismissal. The `beforeRemove` listener below
  // fires the synchronous close on every user-driven exit, so this hook's
  // unmount cleanup is effectively a no-op in production. Kept because some
  // flows (hot reload, programmatic stack reset) skip `beforeRemove`.
  useHeadlessSessionDismissal(headlessSessionId);

  // Phase 9.5: replace the old visible Cancel/Back-button handlers with a
  // navigation listener. `beforeRemove` only fires when *this* screen is
  // being popped (the listener is per-screen). It catches the common case:
  // hardware back / iOS swipe-back while the Host is focused, or a
  // programmatic pop targeting the Host. Other unmount paths
  // (stack reset, parent pop while a child screen has focus, hot reload)
  // are caught by `useHeadlessSessionDismissal`'s unmount cleanup above.
  // closeSession is idempotent: Phase 6 success and Phase 7 errors clear
  // the session before `beforeRemove` and turn this into a no-op.
  //
  // Stack-rebuild guard (Cursor Bugbot): `useTransakRouting` calls
  // `navigation.reset()` to re-pin HEADLESS_HOST at the base of the stack
  // when navigating to VerifyIdentity / BasicInfo / Checkout / KycWebview.
  // The reset action fires `beforeRemove` on the OLD HEADLESS_HOST instance
  // before re-pinning the new one, but the session is still in flight —
  // closing it here would prematurely fire `onClose({ reason: 'user_dismissed' })`
  // and break the flow. Skip the close when the action is a RESET; the
  // legitimate unmount cases (stack reset that does NOT re-pin the Host,
  // hot reload) are caught by `useHeadlessSessionDismissal`'s unmount path
  // with `isHeadlessHostStillInNavigator`.
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (e.data.action.type === 'RESET') {
        return;
      }
      closeSession(headlessSessionId, { reason: 'user_dismissed' });
    });
    return unsubscribe;
  }, [navigation, headlessSessionId]);

  const { userRegion } = useRampsUserRegion();
  const { paymentMethods } = useRampsPaymentMethods();

  // For headless flows, post-auth resets must land back here (not on
  // BuildQuote). We pin the routing base to the Host and re-supply the
  // session id so the Host can resume tracking on re-focus.
  // Memoize so `baseRouteParams` identity is stable; otherwise
  // `useTransakRouting` → `continueWithQuote` churn every render and
  // trigger the session-processing effect unnecessarily.
  const transakRouting = useMemo(
    () => ({
      baseRoute: Routes.RAMP.HEADLESS_HOST,
      baseRouteParams: { headlessSessionId },
    }),
    [headlessSessionId],
  );
  const { continueWithQuote } = useContinueWithQuote({ transakRouting });

  const chainId = session
    ? (getChainIdFromAssetId(session.params.assetId) as CaipChainId | null)
    : null;
  const walletAddress = useRampAccountAddress(chainId ?? ('' as CaipChainId));

  // Auth-loop error path: OtpCode resets back to the Host with
  // `nativeFlowError` set when post-OTP routing fails. Forward to the
  // consumer once and close the session.
  //
  // Re-reads from the registry rather than using the render-time `session`
  // reference so that if the processing effect's .catch already closed the
  // session (both paths firing simultaneously), this becomes a no-op and the
  // consumer's onError is not called a second time.
  useEffect(() => {
    if (!nativeFlowError) {
      return;
    }
    failSession(
      headlessSessionId,
      {
        code: 'AUTH_FAILED',
        message: nativeFlowError,
      },
      'AUTH_FAILED',
    );
  }, [nativeFlowError, headlessSessionId]);

  // Process the session. Uses `useEffect` (not `useFocusEffect`) so that
  // it fires whenever `headlessSessionId` changes even when the screen is
  // already focused — React Navigation reuses the mounted component and
  // merges params rather than remounting, so no focus event is emitted for
  // a second session started while this screen is active.
  //
  // Re-entry during the Transak auth loop is prevented by `session.status`:
  // `setStatus` marks it `'continued'` before the loop starts, and since
  // `headlessSessionId` is unchanged during the loop, the effect does not
  // re-fire.
  //
  // `walletAddress` begins as null while `useRampAccountAddress` resolves
  // async. The effect body validates chainId before deferring on wallet:
  // a null chainId also yields walletAddress === null (falsy chain id), so
  // the invalid-assetId branch must run first or the host would defer
  // forever. After chainId is valid, defer (leave status as 'pending') until
  // walletAddress settles — a non-null value is a required input for
  // widget/order URLs.
  //
  // `session` is intentionally excluded from deps and re-read inside via
  // `getSession(headlessSessionId)`. This removes the fragile object-reference
  // dep and lets the .catch handler confirm the session is still live before
  // firing onError (preventing duplicate callbacks when nativeFlowError and
  // the promise rejection race).
  //
  // `continueWithQuote` is async with no cancellation API; on unmount (or when
  // deps change after this run has started the promise) we must not call
  // consumer callbacks or `closeSession` from a late rejection — avoids
  // spurious `onClose`/`onError` after the consumer already moved on.
  useEffect(() => {
    let cancelled = false;
    const currentSession = getSession(headlessSessionId);
    if (!currentSession || nativeFlowError) {
      return;
    }
    if (currentSession.status !== 'pending') {
      return;
    }
    // Invalid assetId must run before the wallet deferral: when chainId is
    // null we still call useRampAccountAddress with a falsy chain id, which
    // yields walletAddress === null. If we deferred on wallet first, we'd
    // never surface the UNKNOWN invalid-assetId error.
    if (!chainId) {
      const message = `HeadlessHost: invalid assetId "${currentSession.params.assetId}"`;
      Logger.error(new Error(message));
      failSession(headlessSessionId, { code: 'UNKNOWN', message });
      return;
    }
    // Defer until walletAddress resolves — avoids calling continueWithQuote
    // with an undefined address that downstream screens (widget URL, order
    // creation) cannot recover from. Effect re-fires when walletAddress changes.
    if (walletAddress === null) {
      return;
    }

    setStatus(headlessSessionId, 'continued');

    const { quote, amount, assetId, currency, paymentMethodId } =
      currentSession.params;
    // Caller override wins. Otherwise `find` is a membership check on the
    // loaded catalog, not a remap: when it matches, `?.id` equals
    // `quote.quote.paymentMethod`; when the quote id is absent from
    // `paymentMethods` (stale quote, filters, load race), we omit
    // `ctx.paymentMethodId` instead of forwarding an unverified id, and
    // `useContinueWithQuote` falls back to controller-selected payment method.
    const resolvedPaymentMethodId =
      paymentMethodId ??
      paymentMethods?.find((pm) => pm.id === quote.quote.paymentMethod)?.id;

    const ctx: ContinueWithQuoteContext = {
      amount,
      assetId,
      chainId,
      walletAddress: walletAddress ?? undefined,
      currency: currency ?? userRegion?.country?.currency,
      cryptoSymbol: quote.quote.cryptoTranslation?.symbol,
      paymentMethodId: resolvedPaymentMethodId,
      providerName: getQuoteProviderName(quote),
      headlessSessionId,
    };

    continueWithQuote(quote, ctx).catch((error: Error) => {
      if (cancelled) {
        return;
      }
      const message =
        error?.message ?? strings('deposit.buildQuote.unexpectedError');
      Logger.error(
        error,
        `HeadlessHost: continueWithQuote rejected: ${message}`,
      );
      // Re-read from the registry: the nativeFlowError effect may have already
      // closed this session if auth failure arrived via params simultaneously
      // with the promise rejection. If so, bail — the consumer already got
      // onError from the nativeFlowError path.
      const liveSession = getSession(headlessSessionId);
      if (!liveSession) {
        return;
      }
      failSession(headlessSessionId, error);
    });
    return () => {
      cancelled = true;
    };
  }, [
    nativeFlowError,
    chainId,
    headlessSessionId,
    paymentMethods,
    walletAddress,
    userRegion?.country?.currency,
    continueWithQuote,
  ]);

  // The View is intentionally empty — Phase 9.5 hands all visible UI to the
  // consumer. It must also be touch-transparent: the navigation route exists
  // only as an orchestration base, so the empty placeholder should not eat
  // taps/scrolls intended for the consumer surface below.
  //
  // We do NOT set `accessibilityElementsHidden` here because there are no
  // descendants to hide; it would only confuse screen readers about an
  // already-empty stack base.
  return (
    <View
      testID={HEADLESS_HOST_CONTAINER_TEST_ID}
      pointerEvents="none"
      style={styles.container}
    />
  );
}

export default HeadlessHost;
