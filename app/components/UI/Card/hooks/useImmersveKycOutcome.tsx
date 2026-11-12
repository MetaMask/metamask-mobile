import React, { useCallback, useContext } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import {
  Icon,
  IconColor,
  IconName as DesignSystemIconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import type { ToastContextParams } from '../../../../component-library/components/Toast/Toast.types';
import Engine from '../../../../core/Engine';
import { selectCardActiveProviderId } from '../../../../selectors/cardController';
import {
  resetOnboardingState,
  setPendingMoneyAccountCardLink,
} from '../../../../core/redux/slices/card';
import { strings } from '../../../../../locales/i18n';
import Logger from '../../../../util/Logger';
import { useTheme } from '../../../../util/theme';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { cardQueries } from '../queries';
import { describeImmersveKycRejection } from '../util/immersveKycReasons';
import { CardActions, withCardProvider } from '../util/metrics';
import type { ImmersveNextAction } from '../util/immersvePrerequisites';

export type ImmersveKycRejectionSource =
  | 'processing'
  | 'reconcile'
  | 'kyc_failed';

type RejectedAction = Extract<ImmersveNextAction, { type: 'rejected' }>;

/**
 * One permanent rejection signs the user out once. A second caller that
 * arrives while logout is still running (the processing screen and a home
 * screen both seeing the same result) waits on that logout and does not
 * toast again.
 */
let permanentRejectionLogout: Promise<void> | null = null;

const runPermanentRejectionLogout = (
  run: () => Promise<void>,
): Promise<void> => {
  if (permanentRejectionLogout) {
    return permanentRejectionLogout;
  }
  const logout = run().finally(() => {
    permanentRejectionLogout = null;
  });
  permanentRejectionLogout = logout;
  return logout;
};

const showOutcomeToast = (
  toastRef: ToastContextParams['toastRef'],
  {
    title,
    description,
    iconName,
    accessoryName,
    iconColor,
  }: {
    title: string;
    description: string;
    iconName: IconName;
    accessoryName: DesignSystemIconName;
    iconColor: string;
  },
) => {
  toastRef?.current?.showToast({
    variant: ToastVariants.Icon,
    labelOptions: [{ label: title }],
    descriptionOptions: { description },
    iconName,
    iconColor,
    hasNoTimeout: false,
    startAccessory: (
      <Icon
        name={accessoryName}
        color={IconColor.IconDefault}
        size={IconSize.Lg}
      />
    ),
  });
};

/**
 * Shared KYC result messaging. A permanent rejection also ends the Immersve
 * session, so Link card cannot continue against a failed identity check.
 */
export function useImmersveKycOutcome() {
  const { toastRef } = useContext(ToastContext);
  const theme = useTheme();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const activeProviderId = useSelector(selectCardActiveProviderId);

  const signOutOfRejectedKyc = useCallback(async () => {
    try {
      await Engine.context.CardController.logout();
    } catch (error) {
      Logger.error(error as Error, {
        tags: { feature: 'card', provider: 'immersve' },
        context: {
          name: 'useImmersveKycOutcome',
          data: { method: 'signOutOfRejectedKyc' },
        },
      });
    }
    queryClient.removeQueries({ queryKey: cardQueries.keys.all() });
    dispatch(resetOnboardingState());
    dispatch(setPendingMoneyAccountCardLink(null));
  }, [dispatch, queryClient]);

  const notifyKycRejected = useCallback(
    (
      action: RejectedAction,
      options: { source: ImmersveKycRejectionSource; toast?: boolean },
    ): Promise<void> => {
      const run = async () => {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
            .addProperties(
              withCardProvider(activeProviderId, {
                action: CardActions.KYC_REJECTED,
                can_retry: action.canRetry,
                reason_codes: (action.reasons ?? []).join(','),
                source: options.source,
              }),
            )
            .build(),
        );

        if (options.toast !== false) {
          showOutcomeToast(toastRef, {
            title: action.canRetry
              ? strings('card.card_onboarding.kyc_rejected.retry_title')
              : strings('card.card_onboarding.kyc_failed.title'),
            description: describeImmersveKycRejection(
              action.reasons,
              action.canRetry,
            ),
            iconName: IconName.Error,
            accessoryName: DesignSystemIconName.Error,
            iconColor: theme.colors.error.default,
          });
        }

        if (!action.canRetry) {
          await signOutOfRejectedKyc();
        }
      };

      if (!action.canRetry) {
        return runPermanentRejectionLogout(run);
      }
      return run();
    },
    [
      activeProviderId,
      createEventBuilder,
      signOutOfRejectedKyc,
      theme.colors.error.default,
      toastRef,
      trackEvent,
    ],
  );

  const notifyKycInReview = useCallback(() => {
    showOutcomeToast(toastRef, {
      title: strings('money.metamask_card.setup.reviewing_title'),
      description: strings('money.metamask_card.setup.reviewing_description'),
      iconName: IconName.Info,
      accessoryName: DesignSystemIconName.Info,
      iconColor: theme.colors.primary.default,
    });
  }, [theme.colors.primary.default, toastRef]);

  return { notifyKycRejected, notifyKycInReview };
}
