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

const POLL_INTERVAL_MS = 5000;

export function useImmersveCardProvisioning(
  data: CardHomeData | null | undefined,
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
  const dispatch = useDispatch();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const trackEventRef = useRef(trackEvent);
  const createEventBuilderRef = useRef(createEventBuilder);
  const handled = useRef(false);
  // Read via ref so persisting the resolved id does not re-run reconcile and
  // cancel the in-flight attempt (which previously left handled=true forever).
  const reduxFundingSourceIdRef = useRef(reduxFundingSourceId);
  // Read via ref so clearing the flag does not cancel an in-flight createCard.
  const isFundingSettlingRef = useRef(isFundingSettling);
  const wasFundingSettlingRef = useRef(isFundingSettling);
  const wasProvisioningRef = useRef(isProvisioning);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [recheckCount, setRecheckCount] = useState(0);

  useEffect(() => {
    trackEventRef.current = trackEvent;
    createEventBuilderRef.current = createEventBuilder;
    reduxFundingSourceIdRef.current = reduxFundingSourceId;
    isFundingSettlingRef.current = isFundingSettling;
  }, [trackEvent, createEventBuilder, reduxFundingSourceId, isFundingSettling]);
  const [pendingAction, setPendingAction] = useState<ImmersveNextAction | null>(
    null,
  );
  const [hasResolvedStatus, setHasResolvedStatus] = useState(false);
  const isReconciling = isProvisioning && !hasResolvedStatus;
  const isFocused = useIsFocused();

  useEffect(() => {
    if (!isProvisioning) {
      setHasResolvedStatus(false);
      setPendingAction(null);
      handled.current = false;
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
    if (!isProvisioning || !isFocused || pendingAction || isReconciling) {
      return undefined;
    }

    const interval = setInterval(() => {
      Engine.context.CardController.fetchCardHomeData({ force: true }).catch(
        () => undefined,
      );
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isProvisioning, isFocused, pendingAction, isReconciling]);

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
        const clearFundingSettling = () => {
          if (!isFundingSettlingRef.current) {
            return;
          }
          isFundingSettlingRef.current = false;
          dispatch(setImmersveFundingSettling(false));
        };
        const scheduleSettlingRecheck = () => {
          if (settleTimerRef.current) {
            clearTimeout(settleTimerRef.current);
          }
          settleTimerRef.current = setTimeout(() => {
            settleTimerRef.current = null;
            if (!cancelled) {
              setRecheckCount((count) => count + 1);
            }
          }, POLL_INTERVAL_MS);
        };
        if (action.type === 'active') {
          clearFundingSettling();
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
        } else if (isFundingSettlingRef.current && action.type === 'funding') {
          // The allowance is submitted. Stay on "Card being created" and ask
          // again once Immersve has had time to observe it. One reconcile at
          // a time: the next run starts only after this one has finished.
          scheduleSettlingRecheck();
        } else {
          clearFundingSettling();
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
    recheckCount,
  ]);

  const resumePendingAction = useCallback(() => {
    if (!pendingAction) return;
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
    route(pendingAction, { navigateFromRoot: true, countryKey: kycRegion });
  }, [pendingAction, route, kycRegion, trackEvent, createEventBuilder]);

  return {
    isProvisioning,
    isReconciling,
    pendingAction,
    resumePendingAction,
  };
}
