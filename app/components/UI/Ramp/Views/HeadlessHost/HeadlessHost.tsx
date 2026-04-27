import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { CaipChainId } from '@metamask/utils';

import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../util/navigation/navUtils';
import { useStyles } from '../../../../hooks/useStyles';
import HeaderCompactStandard from '../../../../../component-library/components-temp/HeaderCompactStandard';
import Logger from '../../../../../util/Logger';

// Imported from concrete files instead of `../../headless` to avoid a
// circular import: `../../headless/index.ts` re-exports `useHeadlessBuy`,
// which in turn imports this Host (for `createHeadlessHostNavDetails`).
// Going through the barrel would leave the registry exports `undefined`
// at evaluation time inside this module.
import {
  closeSession,
  getSession,
  setStatus,
} from '../../headless/sessionRegistry';
import { getChainIdFromAssetId } from '../../headless/useHeadlessBuy';
import useContinueWithQuote, {
  type ContinueWithQuoteContext,
} from '../../hooks/useContinueWithQuote';
import useRampAccountAddress from '../../hooks/useRampAccountAddress';
import { useRampsUserRegion } from '../../hooks/useRampsUserRegion';
import { useRampsPaymentMethods } from '../../hooks/useRampsPaymentMethods';
import { getQuoteProviderName } from '../../types';

import styleSheet from './HeadlessHost.styles';

export const HEADLESS_HOST_HEADER_TEST_ID = 'headless-host-header';
export const HEADLESS_HOST_BACK_BUTTON_TEST_ID = 'headless-host-back-button';
export const HEADLESS_HOST_LOADER_TEST_ID = 'headless-host-loader';
export const HEADLESS_HOST_NO_SESSION_TEST_ID = 'headless-host-no-session';
export const HEADLESS_HOST_CANCEL_BUTTON_TEST_ID = 'headless-host-cancel';

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
 * Acts as the (stable) stack base for the headless buy flow:
 * - On focus, picks up the live session by `headlessSessionId`.
 * - Derives a `ContinueWithQuoteContext` directly from `session.params.quote` (no controller selections needed).
 * - Calls `useContinueWithQuote().continueWithQuote(...)` exactly once, using the session status as a guard so re-focuses caused by the Transak auth loop don't re-trigger the flow.
 * - Surfaces `nativeFlowError` (set by OtpCode on routing failure) as `onError('AUTH_FAILED', ...)` and closes the session.
 * - When no session is found (e.g. consumer cancelled meanwhile), shows a passive "no session" message with a cancel/back affordance.
 */
function HeadlessHost() {
  const navigation = useNavigation();
  const { styles } = useStyles(styleSheet, {});
  const { headlessSessionId, nativeFlowError } =
    useParams<HeadlessHostParams>();
  const session = getSession(headlessSessionId);

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

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset UI state whenever a new session is wired up, so the second (and
  // subsequent) headless buy starts with a clean slate.
  useEffect(() => {
    setErrorMessage(null);
  }, [headlessSessionId]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Auth-loop error path: OtpCode resets back to the Host with
  // `nativeFlowError` set when post-OTP routing fails. Forward to the
  // consumer once and close the session.
  //
  // Re-reads from the registry rather than using the render-time `session`
  // reference so that if the processing effect's .catch already closed the
  // session (both paths firing simultaneously), this becomes a no-op and the
  // consumer's onError is not called a second time (Bug 1 / Bug 2 fix).
  useEffect(() => {
    if (!nativeFlowError) {
      return;
    }
    const liveSession = getSession(headlessSessionId);
    if (!liveSession) {
      return;
    }
    setErrorMessage(nativeFlowError);
    try {
      liveSession.callbacks.onError({
        code: 'AUTH_FAILED',
        message: nativeFlowError,
      });
    } catch (e) {
      Logger.error(e as Error, 'HeadlessHost: onError callback threw');
    }
    closeSession(headlessSessionId, { reason: 'unknown' });
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
  // the invalid-assetId branch must run first or the host would spin forever.
  // After chainId is valid, defer (leave status as 'pending') until
  // walletAddress settles — a non-null value is a required input for
  // widget/order URLs.
  // When it resolves the effect re-fires (walletAddress is a dep) and
  // proceeds with the real address. The status guard prevents a second
  // invocation once continued.
  //
  // `session` is intentionally excluded from deps and re-read inside via
  // `getSession(headlessSessionId)`. This removes the fragile object-reference
  // dep and lets the .catch handler confirm the session is still live before
  // firing onError (preventing duplicate callbacks when nativeFlowError and
  // the promise rejection race — see previous fixes).
  useEffect(() => {
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
    // spin forever and never surface the UNKNOWN invalid-assetId error.
    if (!chainId) {
      const message = `HeadlessHost: invalid assetId "${currentSession.params.assetId}"`;
      Logger.error(new Error(message));
      try {
        currentSession.callbacks.onError({
          code: 'UNKNOWN',
          message,
        });
      } catch (e) {
        Logger.error(e as Error, 'HeadlessHost: onError callback threw');
      }
      closeSession(headlessSessionId, { reason: 'unknown' });
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
    // Resolve the catalog id for the quote's payment method when the
    // caller didn't pin one explicitly. The native (Transak) path needs
    // a catalog id to look up `selectedPaymentMethod.isManualBankTransfer`.
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
      const message =
        error?.message ?? strings('deposit.buildQuote.unexpectedError');
      // Re-read from the registry: the nativeFlowError effect may have already
      // closed this session if auth failure arrived via params simultaneously
      // with the promise rejection. If so, bail — the consumer already got
      // onError from the nativeFlowError path (Bug 1 fix).
      const liveSession = getSession(headlessSessionId);
      if (!liveSession) {
        return;
      }
      setErrorMessage(message);
      try {
        liveSession.callbacks.onError({
          code: 'UNKNOWN',
          message,
        });
      } catch (e) {
        Logger.error(e as Error, 'HeadlessHost: onError callback threw');
      }
      closeSession(headlessSessionId, { reason: 'unknown' });
    });
  }, [
    nativeFlowError,
    chainId,
    headlessSessionId,
    paymentMethods,
    walletAddress,
    userRegion?.country?.currency,
    continueWithQuote,
  ]);

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <HeaderCompactStandard
        testID={HEADLESS_HOST_HEADER_TEST_ID}
        title={strings('app_settings.fiat_on_ramp.headless_host.title')}
        onBack={handleBack}
        backButtonProps={{ testID: HEADLESS_HOST_BACK_BUTTON_TEST_ID }}
      />
      <View style={styles.body}>
        {errorMessage ? (
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.ErrorDefault}
            style={styles.text}
          >
            {errorMessage}
          </Text>
        ) : session ? (
          <>
            <ActivityIndicator
              size="large"
              style={styles.spinner}
              testID={HEADLESS_HOST_LOADER_TEST_ID}
            />
            <Text variant={TextVariant.BodyMd} style={styles.text}>
              {strings('app_settings.fiat_on_ramp.headless_host.loading')}
            </Text>
          </>
        ) : (
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            style={styles.text}
            testID={HEADLESS_HOST_NO_SESSION_TEST_ID}
          >
            {strings('app_settings.fiat_on_ramp.headless_host.no_session')}
          </Text>
        )}
        <View style={styles.cancelRow}>
          <Button
            variant={ButtonVariant.Tertiary}
            onPress={handleBack}
            testID={HEADLESS_HOST_CANCEL_BUTTON_TEST_ID}
          >
            {strings('app_settings.fiat_on_ramp.headless_host.cancel')}
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

export default HeadlessHost;
