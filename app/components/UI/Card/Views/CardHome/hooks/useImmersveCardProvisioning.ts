import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../../../core/Engine';
import Logger from '../../../../../../util/Logger';
import {
  selectCardActiveProviderId,
  selectCardSelectedCountry,
} from '../../../../../../selectors/cardController';
import { selectPrimaryMoneyAccount } from '../../../../../../selectors/moneyAccountController';
import { safeToChecksumAddress } from '../../../../../../util/address';
import {
  isMoneyAccountFundingChannel,
  selectCardImmersveConfig,
} from '../../../../../../selectors/featureFlagController/card';
import { useImmersveFundingChannel } from '../../../hooks/useImmersveFundingChannel';
import {
  selectImmersveFundingSettling,
  selectImmersveFundingSourceId,
  setImmersveFundingSettling,
  setImmersveFundingSourceId,
} from '../../../../../../core/redux/slices/card';
import {
  CardProviderError,
  CardProviderErrorCode,
  CardProviderIds,
  type CardHomeData,
} from '../../../../../../core/Engine/controllers/card-controller/provider-types';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { KYC_REDIRECT_URL } from '../../../constants';
import {
  deriveNextImmersveAction,
  type ImmersveNextAction,
} from '../../../util/immersvePrerequisites';
import { resolveImmersveFundingSourceId } from '../../../util/immersveResume';
import { CardActions, withCardProvider } from '../../../util/metrics';
import { useImmersveOnboardingRouter } from '../../../hooks/useImmersveOnboardingRouter';
import { useImmersveKycOutcome } from '../../../hooks/useImmersveKycOutcome';
import { CARD_SETUP_PENDING_POLL_MS } from './useCardSetupPendingRefresh';

const POLL_INTERVAL_MS = 5000;
/**
 * Failed quiet retries stop after this many. A funding allowance that is
 * still settling keeps retrying at the delay cap.
 */
const QUIET_RECHECK_MAX_ATTEMPTS = 6;
/** Cap for the exponential quiet-retry delay. */
const QUIET_RECHECK_MAX_DELAY_MS = 60_000;

export interface CardProvisioningOptions {
  /** `null` turns polling off. Omitted keeps the default interval. */
  pollIntervalMs?: number | null;
  navigateFromOutsideCard?: boolean;
  recheckOnFocus?: boolean;
  /**
   * Card home's waiting view re-checks a manual KYC review on its own.
   * Money home leaves this off and keeps the tier-derived poll instead.
   */
  kycReviewSelfCheck?: boolean;
}

export function useImmersveCardProvisioning(
  data: CardHomeData | null | undefined,
  options?: CardProvisioningOptions,
) {
  const providerId = useSelector(selectCardActiveProviderId);
  const isProvisioning =
    providerId === 'immersve' &&
    (data?.alerts ?? []).some(
      (cardAlert) => cardAlert.type === 'card_provisioning',
    );

  const reduxFundingSourceId = useSelector(selectImmersveFundingSourceId);
  const isFundingSettling = useSelector(selectImmersveFundingSettling);
  const kycRegion = useSelector(selectCardSelectedCountry) ?? undefined;
  const immersveConfig = useSelector(selectCardImmersveConfig);
  const fundingChannel = useImmersveFundingChannel(kycRegion);
  const isMoneyAccountChannel = isMoneyAccountFundingChannel(fundingChannel);
  const fundingChannelId =
    fundingChannel?.fundingChannelId || immersveConfig.fundingChannelId;
  const primaryMoneyAccount = useSelector(selectPrimaryMoneyAccount);
  const moneyAccountAddress = isMoneyAccountChannel
    ? safeToChecksumAddress(primaryMoneyAccount?.address)
    : undefined;
  const route = useImmersveOnboardingRouter();
  const { notifyKycRejected } = useImmersveKycOutcome();
  const dispatch = useDispatch();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const trackEventRef = useRef(trackEvent);
  const createEventBuilderRef = useRef(createEventBuilder);
  const notifyKycRejectedRef = useRef(notifyKycRejected);
  const handled = useRef(false);
  // Read via ref so persisting the resolved id does not re-run reconcile and
  // cancel the in-flight attempt (which previously left handled=true forever).
  const reduxFundingSourceIdRef = useRef(reduxFundingSourceId);
  // Read via ref so clearing the flag does not cancel an in-flight createCard.
  const isFundingSettlingRef = useRef(isFundingSettling);
  const wasFundingSettlingRef = useRef(isFundingSettling);
  const wasProvisioningRef = useRef(isProvisioning);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quietRecheckAttemptRef = useRef(0);
  // Failed reconciles and createCard calls only. Funding-settling waits back
  // off on the shared counter above but never spend this budget.
  const errorRetryCountRef = useRef(0);
  // Last next_action reported as IMMERSVE_ONBOARDING_ROUTED. Rechecks of an
  // unchanged step (a review still pending) do not report it again.
  const lastRoutedActionTypeRef = useRef<string | null>(null);
  // An error retry that could not be scheduled because the device was offline,
  // or whose timer was cleared on the way offline. Coming back online runs it.
  const retryDroppedOfflineRef = useRef(false);
  const createCardStartedRef = useRef(false);
  const [recheckCount, setRecheckCount] = useState(0);
  // A review self-check in flight. Pauses the self-check timer without
  // touching hasResolvedStatus, so the review banner and card art stay put.
  const [isSelfCheckRunning, setIsSelfCheckRunning] = useState(false);
  const [pendingAction, setPendingAction] = useState<ImmersveNextAction | null>(
    null,
  );
  const [hasResolvedStatus, setHasResolvedStatus] = useState(false);
  const isReconciling = isProvisioning && !hasResolvedStatus;
  const isFocused = useIsFocused();
  const isFocusedRef = useRef(isFocused);

  useEffect(() => {
    trackEventRef.current = trackEvent;
    createEventBuilderRef.current = createEventBuilder;
    notifyKycRejectedRef.current = notifyKycRejected;
    reduxFundingSourceIdRef.current = reduxFundingSourceId;
    isFundingSettlingRef.current = isFundingSettling;
    isFocusedRef.current = isFocused;
  }, [
    trackEvent,
    createEventBuilder,
    reduxFundingSourceId,
    isFundingSettling,
    isFocused,
    notifyKycRejected,
  ]);
  const pollIntervalMs =
    options?.pollIntervalMs === undefined
      ? POLL_INTERVAL_MS
      : options.pollIntervalMs;
  // Latest interval for the settling retry. The reconcile effect must not
  // depend on it, or a network change cancels the request in flight.
  const pollIntervalMsRef = useRef(pollIntervalMs);
  pollIntervalMsRef.current = pollIntervalMs;
  const navigateFromOutsideCard = options?.navigateFromOutsideCard === true;
  const recheckOnFocus = options?.recheckOnFocus === true;
  const kycReviewSelfCheck = options?.kycReviewSelfCheck === true;
  const [focusRecheckCount, setFocusRecheckCount] = useState(0);
  const wasFocusedRef = useRef(isFocused);
  // Set only when this screen opens a Card flow. Bottom sheets and other
  // Money screens also blur Money home, and those returns must not recheck.
  const hasOpenedCardFlowRef = useRef(false);
  const markCardFlowOpened = useCallback(() => {
    hasOpenedCardFlowRef.current = true;
  }, []);
  // A screen under a Card flow waits until it is focused again. The flow on
  // top resolves the same funding source, and a second create is rejected.
  const isReconcileDeferredRef = useRef(false);

  useEffect(() => {
    if (!isProvisioning) {
      setHasResolvedStatus(false);
      setPendingAction(null);
      handled.current = false;
      setIsSelfCheckRunning(false);
      quietRecheckAttemptRef.current = 0;
      errorRetryCountRef.current = 0;
      lastRoutedActionTypeRef.current = null;
      retryDroppedOfflineRef.current = false;
      createCardStartedRef.current = false;
      // Only a real card (provisioning just ended) clears the wait. A home
      // screen that has not loaded its provisioning alert yet must not.
      if (wasProvisioningRef.current && isFundingSettlingRef.current) {
        isFundingSettlingRef.current = false;
        dispatch(setImmersveFundingSettling(false));
      }
    }
    wasProvisioningRef.current = isProvisioning;
  }, [isProvisioning, dispatch]);

  // The approval finished after this screen had already shown Enable card.
  // Drop that action and reconcile again without flashing the skeleton.
  useEffect(() => {
    const startedSettling = isFundingSettling && !wasFundingSettlingRef.current;
    wasFundingSettlingRef.current = isFundingSettling;
    if (!startedSettling || !isProvisioning) {
      return;
    }
    setPendingAction(null);
    setRecheckCount((count) => count + 1);
  }, [isFundingSettling, isProvisioning]);

  useEffect(() => {
    if (
      !isProvisioning ||
      !isFocused ||
      pendingAction ||
      isReconciling ||
      pollIntervalMs === null
    ) {
      return undefined;
    }

    const interval = setInterval(() => {
      Engine.context.CardController.fetchCardHomeData({ force: true }).catch(
        () => undefined,
      );
    }, pollIntervalMs);

    return () => clearInterval(interval);
  }, [isProvisioning, isFocused, pendingAction, isReconciling, pollIntervalMs]);

  const isProvisioningPollActive =
    isProvisioning &&
    isFocused &&
    !pendingAction &&
    !isReconciling &&
    pollIntervalMs !== null;

  // Going offline drops a waiting retry. Coming back restarts a funding
  // settle, and an error retry that was dropped before its timer could run.
  // A reconcile already running, or a retry already waiting, is left alone.
  const wasOfflineRef = useRef(pollIntervalMs === null);
  useEffect(() => {
    const wasOffline = wasOfflineRef.current;
    wasOfflineRef.current = pollIntervalMs === null;
    if (pollIntervalMs === null) {
      if (settleTimerRef.current) {
        clearTimeout(settleTimerRef.current);
        settleTimerRef.current = null;
        retryDroppedOfflineRef.current = true;
      }
      return;
    }
    if (
      !wasOffline ||
      !isProvisioning ||
      (!isFundingSettling && !retryDroppedOfflineRef.current) ||
      isReconciling ||
      settleTimerRef.current
    ) {
      return;
    }
    retryDroppedOfflineRef.current = false;
    setRecheckCount((count) => count + 1);
  }, [pollIntervalMs, isProvisioning, isFundingSettling, isReconciling]);

  useEffect(() => {
    const regainedFocus = isFocused && !wasFocusedRef.current;
    wasFocusedRef.current = isFocused;
    if (!regainedFocus) {
      return;
    }
    if (isReconcileDeferredRef.current) {
      isReconcileDeferredRef.current = false;
      hasOpenedCardFlowRef.current = false;
      // Same as the recheck below: Continue stays disabled until it lands.
      setHasResolvedStatus(false);
      setRecheckCount((count) => count + 1);
      return;
    }
    if (!recheckOnFocus) {
      return;
    }
    // Sheets and other Money screens also blur Money home. Only a Card screen
    // this view opened should recheck the left-off step.
    const openedCardFlow = hasOpenedCardFlowRef.current;
    hasOpenedCardFlowRef.current = false;
    // Under review, and a permanent rejection, can change without the user
    // opening another Card screen. Recheck those on every return.
    const reviewsKyc =
      pendingAction?.type === 'pending' ||
      (pendingAction?.type === 'rejected' && !pendingAction.canRetry);
    if (
      (!openedCardFlow && !reviewsKyc) ||
      !isProvisioning ||
      !hasResolvedStatus
    ) {
      return;
    }
    // Drop the resolved flag before the recheck so Continue stays disabled
    // until the new prerequisites land. The previous action is kept so a
    // failed recheck can still resume it.
    setHasResolvedStatus(false);
    setFocusRecheckCount((count) => count + 1);
  }, [
    isFocused,
    recheckOnFocus,
    isProvisioning,
    hasResolvedStatus,
    pendingAction,
  ]);

  // A manual review outlives this visit. One check when the app comes back,
  // instead of a timer, matches Immersve's direct-integration guidance.
  useEffect(() => {
    if (!recheckOnFocus) {
      return undefined;
    }
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') {
        return;
      }
      if (
        !isFocusedRef.current ||
        !isProvisioning ||
        !hasResolvedStatus ||
        pendingAction?.type !== 'pending'
      ) {
        return;
      }
      setHasResolvedStatus(false);
      setFocusRecheckCount((count) => count + 1);
    });
    return () => subscription.remove();
  }, [recheckOnFocus, isProvisioning, hasResolvedStatus, pendingAction?.type]);

  // Card home opts in so a manual KYC review moves on by itself. Money home
  // does not: it already polls on the tier-derived interval, and a fixed 15s
  // timer would ignore that cadence (including "stop" when the interval is
  // null). Refocus and app-foreground rechecks stay immediate.
  useEffect(() => {
    if (
      !kycReviewSelfCheck ||
      pollIntervalMs === null ||
      !isProvisioning ||
      !isFocused ||
      isReconciling ||
      isSelfCheckRunning ||
      pendingAction?.type !== 'pending'
    ) {
      return undefined;
    }
    // A review rechecks every 15s on every network, the same cadence as Card
    // home's own review poll. A slower provisioning interval still wins. The
    // check runs quietly: the screen keeps the review state, and the timer
    // pauses until the check lands instead of cancelling it.
    const interval = setInterval(
      () => {
        setIsSelfCheckRunning(true);
        setRecheckCount((count) => count + 1);
      },
      Math.max(pollIntervalMs, CARD_SETUP_PENDING_POLL_MS),
    );
    return () => clearInterval(interval);
  }, [
    kycReviewSelfCheck,
    pollIntervalMs,
    isProvisioning,
    isFocused,
    isReconciling,
    isSelfCheckRunning,
    pendingAction?.type,
  ]);

  useEffect(() => {
    if (!isProvisioning || handled.current) {
      return undefined;
    }
    if (!isFocusedRef.current) {
      isReconcileDeferredRef.current = true;
      return undefined;
    }
    handled.current = true;
    let cancelled = false;
    const existingId = reduxFundingSourceIdRef.current;
    // Shared by the funding-still-pending path, a failed createCard and a
    // failed reconcile: a throw must never leave the waiting view stuck with
    // nothing scheduled to try again.
    const scheduleQuietRecheck = ({
      limitAttempts = true,
    }: {
      limitAttempts?: boolean;
    } = {}) => {
      if (settleTimerRef.current) {
        clearTimeout(settleTimerRef.current);
      }
      // Offline callers pass null and must not keep asking. Remember the
      // drop so coming back online runs this retry.
      const intervalMs = pollIntervalMsRef.current;
      if (intervalMs === null) {
        retryDroppedOfflineRef.current = true;
        return;
      }
      if (limitAttempts) {
        if (errorRetryCountRef.current >= QUIET_RECHECK_MAX_ATTEMPTS) {
          return;
        }
        errorRetryCountRef.current += 1;
      }
      const attempt = quietRecheckAttemptRef.current;
      quietRecheckAttemptRef.current = attempt + 1;
      const delayMs = Math.min(
        intervalMs * 2 ** attempt,
        QUIET_RECHECK_MAX_DELAY_MS,
      );
      settleTimerRef.current = setTimeout(() => {
        settleTimerRef.current = null;
        if (!cancelled) {
          setRecheckCount((count) => count + 1);
        }
      }, delayMs);
    };
    const resetQuietRecheck = () => {
      quietRecheckAttemptRef.current = 0;
      errorRetryCountRef.current = 0;
    };

    (async () => {
      try {
        const controller = Engine.context.CardController;
        if (isMoneyAccountChannel && !moneyAccountAddress) {
          Logger.error(
            new Error(
              'useImmersveCardProvisioning: Money account address is missing',
            ),
            {
              tags: { feature: 'card', provider: 'immersve' },
              context: {
                name: 'useImmersveCardProvisioning',
                data: { method: 'reconcile' },
              },
            },
          );
          return;
        }
        const id = await resolveImmersveFundingSourceId({
          fundingChannelId,
          existingId: isMoneyAccountChannel ? undefined : existingId,
          moneyAccountAddress,
        });
        if (cancelled) return;
        // A Money account reconcile ignores the stored wallet source, so the
        // resolved id can differ from the one already in Redux.
        if (id !== existingId) {
          dispatch(setImmersveFundingSourceId(id));
        }
        const { prerequisites } = await controller.getSpendingPrerequisites(
          id,
          { kycRegion, kycRedirectUrl: KYC_REDIRECT_URL },
        );
        if (cancelled) return;
        const action = deriveNextImmersveAction(prerequisites);
        const clearFundingSettling = () => {
          if (!isFundingSettlingRef.current) {
            return;
          }
          isFundingSettlingRef.current = false;
          dispatch(setImmersveFundingSettling(false));
        };
        if (action.type === 'active') {
          setPendingAction(null);
          clearFundingSettling();
          // Funding lifecycle only when we actually create the card. An
          // automatic retry must not emit STARTED again; the first attempt
          // already opened that lifecycle.
          if (!createCardStartedRef.current) {
            createCardStartedRef.current = true;
            trackEventRef.current(
              createEventBuilderRef
                .current(MetaMetricsEvents.CARD_FUNDING_PROCESS_STARTED)
                .addProperties(
                  withCardProvider(CardProviderIds.Immersve, {
                    step: 'provisioning_create_card',
                  }),
                )
                .build(),
            );
          }
          try {
            await controller.createCard(id);
            if (cancelled) return;
            resetQuietRecheck();
            trackEventRef.current(
              createEventBuilderRef
                .current(MetaMetricsEvents.CARD_FUNDING_PROCESS_COMPLETED)
                .addProperties(
                  withCardProvider(CardProviderIds.Immersve, {
                    step: 'provisioning_create_card',
                  }),
                )
                .build(),
            );
          } catch (createError) {
            if (cancelled) return;
            if (
              createError instanceof CardProviderError &&
              createError.code === CardProviderErrorCode.Conflict
            ) {
              trackEventRef.current(
                createEventBuilderRef
                  .current(MetaMetricsEvents.CARD_FUNDING_PROCESS_COMPLETED)
                  .addProperties(
                    withCardProvider(CardProviderIds.Immersve, {
                      step: 'provisioning_create_card',
                      already_provisioned: true,
                    }),
                  )
                  .build(),
              );
              resetQuietRecheck();
              return;
            }
            trackEventRef.current(
              createEventBuilderRef
                .current(MetaMetricsEvents.CARD_FUNDING_PROCESS_FAILED)
                .addProperties(
                  withCardProvider(CardProviderIds.Immersve, {
                    step: 'provisioning_create_card',
                  }),
                )
                .build(),
            );
            Logger.error(createError as Error, {
              tags: { feature: 'card', provider: 'immersve' },
              context: {
                name: 'useImmersveCardProvisioning',
                data: { method: 'createCard' },
              },
            });
            // The card was not created. Ask again shortly instead of leaving
            // the waiting view up with nothing scheduled to move it on.
            scheduleQuietRecheck();
          }
        } else if (isFundingSettlingRef.current && action.type === 'funding') {
          // The allowance is submitted. Stay on "Card being created" and ask
          // again once Immersve has had time to observe it. This wait is not
          // an error, so it keeps going at the delay cap. One reconcile at
          // a time: the next run starts only after this one has finished.
          scheduleQuietRecheck({ limitAttempts: false });
        } else {
          clearFundingSettling();
          resetQuietRecheck();
          // Mid-onboarding — no Funding Process STARTED (avoids orphan starts).
          setPendingAction(action);
          if (
            !cancelled &&
            action.type === 'rejected' &&
            !action.canRetry &&
            isFocusedRef.current
          ) {
            notifyKycRejectedRef
              .current(action, {
                source: 'reconcile',
              })
              .catch(() => undefined);
          }
          if (cancelled || lastRoutedActionTypeRef.current === action.type) {
            return;
          }
          lastRoutedActionTypeRef.current = action.type;
          trackEventRef.current(
            createEventBuilderRef
              .current(MetaMetricsEvents.CARD_BUTTON_CLICKED)
              .addProperties(
                withCardProvider(CardProviderIds.Immersve, {
                  action: CardActions.IMMERSVE_ONBOARDING_ROUTED,
                  next_action: action.type,
                  step: 'provisioning_reconcile',
                }),
              )
              .build(),
          );
        }
      } catch (error) {
        if (cancelled) return;
        if (
          error instanceof CardProviderError &&
          error.code === CardProviderErrorCode.Conflict
        ) {
          // Conflict before createCard (e.g. reconcile race) — terminal success.
          // Use BUTTON (not Funding COMPLETED) so we don't orphan a completion
          // without a matching CARD_FUNDING_PROCESS_STARTED.
          setPendingAction(null);
          resetQuietRecheck();
          trackEventRef.current(
            createEventBuilderRef
              .current(MetaMetricsEvents.CARD_BUTTON_CLICKED)
              .addProperties(
                withCardProvider(CardProviderIds.Immersve, {
                  action: CardActions.IMMERSVE_ONBOARDING_ROUTED,
                  step: 'provisioning_reconcile',
                  status: 'completed',
                  already_provisioned: true,
                }),
              )
              .build(),
          );
          return;
        }
        handled.current = false;
        // Quiet retry: a failed status check must not leave the waiting view
        // stuck. Ask again on the next quiet cadence unless the device is
        // offline (a null interval means "stop asking").
        scheduleQuietRecheck();
        trackEventRef.current(
          createEventBuilderRef
            .current(MetaMetricsEvents.CARD_BUTTON_CLICKED)
            .addProperties(
              withCardProvider(CardProviderIds.Immersve, {
                action: CardActions.IMMERSVE_ONBOARDING_ROUTED,
                step: 'provisioning_reconcile',
                status: 'failed',
              }),
            )
            .build(),
        );
        Logger.error(error as Error, {
          tags: { feature: 'card', provider: 'immersve' },
          context: {
            name: 'useImmersveCardProvisioning',
            data: { method: 'reconcile' },
          },
        });
      } finally {
        if (!cancelled) {
          setHasResolvedStatus(true);
          setIsSelfCheckRunning(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      handled.current = false;
      if (settleTimerRef.current) {
        clearTimeout(settleTimerRef.current);
        settleTimerRef.current = null;
      }
    };
  }, [
    isProvisioning,
    kycRegion,
    fundingChannelId,
    isMoneyAccountChannel,
    moneyAccountAddress,
    dispatch,
    focusRecheckCount,
    recheckCount,
  ]);

  const resumePendingAction = useCallback(() => {
    if (!pendingAction || isReconciling) return;
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties(
          withCardProvider(CardProviderIds.Immersve, {
            action: CardActions.IMMERSVE_PROVISIONING_RESUME,
            next_action: pendingAction.type,
          }),
        )
        .build(),
    );
    hasOpenedCardFlowRef.current = true;
    route(pendingAction, {
      navigateFromRoot: true,
      countryKey: kycRegion,
      ...(navigateFromOutsideCard ? { navigateFromOutsideCard: true } : {}),
    });
  }, [
    pendingAction,
    isReconciling,
    route,
    kycRegion,
    trackEvent,
    createEventBuilder,
    navigateFromOutsideCard,
  ]);

  // Re-runs the reconcile check. The waiting view uses it so a pull to
  // refresh re-checks the review it is waiting on. Mirrors the focus
  // recheck: the resolved flag drops first so the screen reads reconciling
  // until the new check lands, and a recheck while one is already running
  // (from the focus path) is a no-op.
  const recheck = useCallback(() => {
    if (isReconciling) {
      return;
    }
    quietRecheckAttemptRef.current = 0;
    errorRetryCountRef.current = 0;
    retryDroppedOfflineRef.current = false;
    setHasResolvedStatus(false);
    setRecheckCount((count) => count + 1);
  }, [isReconciling]);

  return {
    isProvisioning,
    isReconciling,
    pendingAction,
    resumePendingAction,
    recheck,
    markCardFlowOpened,
    isProvisioningPollActive,
  };
}
