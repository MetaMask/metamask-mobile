import React, { useCallback, useContext } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import {
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
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
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { cardQueries } from '../queries';
import { describeImmersveKycFinal } from '../util/immersveKycReasons';
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

const runPermanentRejectionLogout = async (
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
  }: {
    title: string;
    description: string;
    iconName: IconName;
  },
) => {
  toastRef?.current?.showToast({
    variant: ToastVariants.Plain,
    labelOptions: [{ label: title }],
    descriptionOptions: { description },
    hasNoTimeout: false,
    startAccessory: (
      <Icon name={iconName} color={IconColor.IconDefault} size={IconSize.Lg} />
    ),
  });
};

/**
 * Shared final KYC result messaging. A rejection also ends the Immersve
 * session, so Link card cannot continue against a failed identity check.
 */
export function useImmersveKycOutcome() {
  const { toastRef } = useContext(ToastContext);
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

  const signOutOnce = useCallback(
    async () => runPermanentRejectionLogout(signOutOfRejectedKyc),
    [signOutOfRejectedKyc],
  );

  /**
   * `signOut: false` only tracks (and toasts). The caller then owns the
   * sign-out, e.g. once the user leaves a screen with a support link that
   * needs the session's provider user id.
   */
  const notifyKycRejected = useCallback(
    async (
      action: RejectedAction,
      options: {
        source: ImmersveKycRejectionSource;
        toast?: boolean;
        signOut?: boolean;
      },
    ): Promise<void> => {
      const run = async () => {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
            .addProperties(
              withCardProvider(activeProviderId, {
                action: CardActions.KYC_REJECTED,
                can_retry: false,
                reason_codes: (action.reasons ?? []).join(','),
                source: options.source,
              }),
            )
            .build(),
        );

        if (options.toast !== false) {
          showOutcomeToast(toastRef, {
            ...describeImmersveKycFinal(action.reasons),
            iconName: IconName.Error,
          });
        }

        if (options.signOut !== false) {
          await signOutOfRejectedKyc();
        }
      };

      return options.signOut === false
        ? run()
        : runPermanentRejectionLogout(run);
    },
    [
      activeProviderId,
      createEventBuilder,
      signOutOfRejectedKyc,
      toastRef,
      trackEvent,
    ],
  );

  const notifyKycInReview = useCallback(() => {
    showOutcomeToast(toastRef, {
      title: strings('money.metamask_card.setup.reviewing_title'),
      description: strings('money.metamask_card.setup.reviewing_description'),
      iconName: IconName.Info,
    });
  }, [toastRef]);

  return {
    notifyKycRejected,
    notifyKycInReview,
    signOutOfRejectedKyc: signOutOnce,
  };
}
