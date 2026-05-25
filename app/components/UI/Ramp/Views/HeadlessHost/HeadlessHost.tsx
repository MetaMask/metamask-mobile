import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { CaipChainId } from '@metamask/utils';

import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../util/navigation/navUtils';
import {
  Text,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../hooks/useStyles';
import { useTheme } from '../../../../../util/theme';
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
  /** Debug-nav only: show status UI and skip `continueWithQuote` (panel preview). */
  debugPreviewUi?: boolean;
}

/**
 * Navigation helper for jumping to the Headless Host screen. The Host is
 * the stack base for the headless buy flow — `useTransakRouting` resets
 * land back here so post-auth navigation has somewhere to root.
 */
export const createHeadlessHostNavDetails =
  createNavigationDetails<HeadlessHostParams>(Routes.RAMP.HEADLESS_HOST);

function HeadlessHost() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { styles } = useStyles(styleSheet, {});
  const { headlessSessionId, nativeFlowError, debugPreviewUi } =
    useParams<HeadlessHostParams>();
  const { colors } = useTheme();
  const session = getSession(headlessSessionId);
  const isDebugPreviewOnly = debugPreviewUi === true;

  useEffect(() => {
    setHeadlessEntryCardTouchThrough(navigation, isFocused);

    return () => {
      setHeadlessEntryCardTouchThrough(navigation, false);
    };
  }, [navigation, isFocused]);

  useHeadlessSessionDismissal(headlessSessionId);

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
    if (isDebugPreviewOnly) {
      return;
    }
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
    isDebugPreviewOnly,
  ]);

  const devStatusMessage = useMemo(() => {
    if (!session) {
      return 'No session registered. Use Token Selection → "Headless (flow)".';
    }
    if (nativeFlowError) {
      return `Auth error: ${nativeFlowError}`;
    }
    if (!chainId) {
      return `Invalid assetId: ${session.params.assetId}`;
    }
    if (walletAddress === null) {
      return 'Resolving wallet address…';
    }
    if (session.status === 'continued') {
      return 'Opening next screen (Verify identity / Enter email / Checkout)…';
    }
    if (session.status !== 'pending') {
      return `Session status: ${session.status}`;
    }
    return 'Starting headless buy…';
  }, [session, nativeFlowError, chainId, walletAddress]);

  return (
    <View testID={HEADLESS_HOST_CONTAINER_TEST_ID} style={styles.container}>
      <View style={styles.body}>
        <ActivityIndicator
          size="large"
          color={colors.primary.default}
          style={styles.spinner}
        />
        <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Medium}>
          Headless Host (dev)
        </Text>
        {devStatusMessage ? (
          <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
            {devStatusMessage}
          </Text>
        ) : null}
        {session ? (
          <Text variant={TextVariant.BodySm} twClassName="text-alternative">
            {`id: ${headlessSessionId.slice(0, 24)}… · $${session.params.amount} ${session.params.currency ?? 'USD'}`}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default HeadlessHost;
