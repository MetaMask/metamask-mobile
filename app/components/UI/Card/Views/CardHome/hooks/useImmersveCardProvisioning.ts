import { useCallback, useEffect, useRef, useState } from 'react';
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
  selectImmersveFundingSourceId,
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

const POLL_INTERVAL_MS = 5000;

export interface CardProvisioningOptions {
  /** `null` turns polling off. Omitted keeps the default interval. */
  pollIntervalMs?: number | null;
  navigateFromOutsideCard?: boolean;
  recheckOnFocus?: boolean;
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
  const dispatch = useDispatch();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const trackEventRef = useRef(trackEvent);
  const createEventBuilderRef = useRef(createEventBuilder);
  const handled = useRef(false);
  // Read via ref so persisting the resolved id does not re-run reconcile and
  // cancel the in-flight attempt (which previously left handled=true forever).
  const reduxFundingSourceIdRef = useRef(reduxFundingSourceId);

  useEffect(() => {
    trackEventRef.current = trackEvent;
    createEventBuilderRef.current = createEventBuilder;
    reduxFundingSourceIdRef.current = reduxFundingSourceId;
  }, [trackEvent, createEventBuilder, reduxFundingSourceId]);
  const [pendingAction, setPendingAction] = useState<ImmersveNextAction | null>(
    null,
  );
  const [hasResolvedStatus, setHasResolvedStatus] = useState(false);
  const isReconciling = isProvisioning && !hasResolvedStatus;
  const isFocused = useIsFocused();
  const pollIntervalMs =
    options?.pollIntervalMs === undefined
      ? POLL_INTERVAL_MS
      : options.pollIntervalMs;
  const navigateFromOutsideCard = options?.navigateFromOutsideCard === true;
  const recheckOnFocus = options?.recheckOnFocus === true;
  const [focusRecheckCount, setFocusRecheckCount] = useState(0);
  const wasFocusedRef = useRef(isFocused);
  // Set only when this screen opens a Card flow. Bottom sheets and other
  // Money screens also blur Money home, and those returns must not recheck.
  const hasOpenedCardFlowRef = useRef(false);
  const markCardFlowOpened = useCallback(() => {
    hasOpenedCardFlowRef.current = true;
  }, []);

  useEffect(() => {
    if (!isProvisioning) {
      setHasResolvedStatus(false);
      setPendingAction(null);
      handled.current = false;
    }
  }, [isProvisioning]);

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

  useEffect(() => {
    const regainedFocus = isFocused && !wasFocusedRef.current;
    wasFocusedRef.current = isFocused;
    if (!regainedFocus || !recheckOnFocus) {
      return;
    }
    // Sheets and other Money screens also blur Money home. Only a Card screen
    // this view opened should recheck the left-off step.
    const openedCardFlow = hasOpenedCardFlowRef.current;
    hasOpenedCardFlowRef.current = false;
    if (!openedCardFlow || !isProvisioning || !hasResolvedStatus) {
      return;
    }
    // Drop the resolved flag before the recheck so Continue stays disabled
    // until the new prerequisites land. The previous action is kept so a
    // failed recheck can still resume it.
    setHasResolvedStatus(false);
    setFocusRecheckCount((count) => count + 1);
  }, [isFocused, recheckOnFocus, isProvisioning, hasResolvedStatus]);

  useEffect(() => {
    if (!isProvisioning || handled.current) {
      return undefined;
    }
    handled.current = true;
    let cancelled = false;
    const existingId = reduxFundingSourceIdRef.current;

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
        if (action.type === 'active') {
          setPendingAction(null);
          // Funding lifecycle only when we actually create the card.
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
          try {
            await controller.createCard(id);
            if (cancelled) return;
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
          }
        } else {
          // Mid-onboarding — no Funding Process STARTED (avoids orphan starts).
          setPendingAction(action);
          if (cancelled) return;
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
        }
      }
    })();
    return () => {
      cancelled = true;
      handled.current = false;
    };
  }, [
    isProvisioning,
    kycRegion,
    fundingChannelId,
    isMoneyAccountChannel,
    moneyAccountAddress,
    dispatch,
    focusRecheckCount,
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

  return {
    isProvisioning,
    isReconciling,
    pendingAction,
    resumePendingAction,
    markCardFlowOpened,
  };
}
