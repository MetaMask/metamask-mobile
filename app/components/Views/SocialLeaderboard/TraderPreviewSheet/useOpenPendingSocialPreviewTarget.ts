import { useCallback, useContext } from 'react';
import { strings } from '../../../../../locales/i18n';
import Engine from '../../../../core/Engine';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { openSharedPositionOnProfile } from '../../../../core/DeeplinkManager/handlers/legacy/socialPositionSheetDeeplink';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import { IconName as ComponentLibraryIconName } from '../../../../component-library/components/Icons/Icon';
import { useTheme } from '../../../../util/theme';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { normalizeMoneyReferralCode } from '../../../UI/Rewards/utils/moneyReferralCode';
import { getRegisterRefereeRefusalReason } from '../../../UI/Rewards/hooks/useAcceptMoneyReferralCode';
import { navigateToSocialV1Profile } from '../navigation/navigateToSocialV1Profile';
import { takePendingSocialPreviewTarget } from './pendingSocialPreviewTarget';

const LOG_PREFIX = '[useOpenPendingSocialPreviewTarget]';

/**
 * For Social onboarding exits. When onboarding was started from the trader
 * preview, returns a function that leaves onboarding, opens the profile or
 * position the link pointed to, and registers the referral code the user
 * agreed to accept. The user follows the trader from the profile themselves.
 *
 * The returned function reports `false` when there is no link to open, so the
 * caller runs its usual exit.
 */
export const useOpenPendingSocialPreviewTarget = (): ((
  navigation: Pick<AppNavigationProp, 'navigate' | 'goBack'>,
) => boolean) => {
  const { toastRef } = useContext(ToastContext);
  const { colors } = useTheme();
  const { trackEvent, createEventBuilder } = useAnalytics();

  const trackReferral = useCallback(
    (
      referralCode: string,
      properties:
        | { interaction_type: 'accepted' }
        | { interaction_type: 'refused'; refusal_reason: string },
    ) => {
      trackEvent(
        createEventBuilder(
          MetaMetricsEvents.REWARDS_MONEY_REFERRAL_OFFER_INTERACTED,
        )
          .addProperties({
            referral_code: referralCode,
            entry_type: 'deeplink',
            ...properties,
          })
          .build(),
      );
    },
    [createEventBuilder, trackEvent],
  );

  const acceptReferral = useCallback(
    async (referralCode: string) => {
      try {
        await Engine.controllerMessenger.call(
          'RewardsMoneyController:registerReferee',
          { code: normalizeMoneyReferralCode(referralCode) },
        );
      } catch (error) {
        DevLogger.log(`${LOG_PREFIX} Failed to accept the referral:`, error);
        trackReferral(referralCode, {
          interaction_type: 'refused',
          refusal_reason: getRegisterRefereeRefusalReason(error),
        });
        toastRef?.current?.showToast({
          variant: ToastVariants.Icon,
          iconName: ComponentLibraryIconName.Danger,
          iconColor: colors.error.default,
          labelOptions: [
            {
              label: strings(
                'social_leaderboard.trader_preview.referral_failed',
              ),
              isBold: true,
            },
          ],
          descriptionOptions: {
            description: strings(
              'social_leaderboard.trader_preview.referral_failed_description',
            ),
          },
          hasNoTimeout: false,
        });
        return;
      }
      trackReferral(referralCode, { interaction_type: 'accepted' });
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        iconName: ComponentLibraryIconName.Confirmation,
        iconColor: colors.success.default,
        labelOptions: [
          {
            label: strings(
              'social_leaderboard.trader_preview.referral_accepted',
            ),
          },
        ],
        hasNoTimeout: false,
      });
    },
    [colors, toastRef, trackReferral],
  );

  return useCallback(
    (navigation) => {
      const target = takePendingSocialPreviewTarget('onboarding');
      if (!target) {
        return false;
      }
      // Leave onboarding first, so back from the profile returns to Home.
      navigation.goBack();
      if (target.kind === 'position') {
        openSharedPositionOnProfile(
          target.positionId,
          target.traderId,
          LOG_PREFIX,
        );
      } else {
        navigateToSocialV1Profile(navigation, {
          traderId: target.traderId,
          source: 'deep_link',
        });
      }
      if (target.referralCode) {
        acceptReferral(target.referralCode).catch(() => undefined);
      }
      return true;
    },
    [acceptReferral],
  );
};
