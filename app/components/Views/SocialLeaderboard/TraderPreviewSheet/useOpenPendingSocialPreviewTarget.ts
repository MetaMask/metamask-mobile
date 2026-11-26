import { useCallback, useContext } from 'react';
import { useDispatch } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
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
import { releaseAnsweredReferralCode } from '../../../../reducers/rewardsMoney';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import {
  getRegisterRefereeErrorTitle,
  getRegisterRefereeRefusalReason,
  type ReferralRefusalReason,
} from '../../../UI/Rewards/hooks/useAcceptMoneyReferralCode';
import { useRegisterMoneyReferee } from '../../../UI/Rewards/hooks/useRegisterMoneyReferee';
import { navigateToSocialV1Profile } from '../navigation/navigateToSocialV1Profile';
import { takePendingSocialPreviewTarget } from './pendingSocialPreviewTarget';

const LOG_PREFIX = '[useOpenPendingSocialPreviewTarget]';

/**
 * Refusals a later attempt can get past. The code is offered again when its
 * link is reopened. Every other refusal is final for this profile.
 */
const RETRYABLE_REFUSAL_REASONS: ReadonlySet<ReferralRefusalReason> = new Set([
  'registration_failed',
  'rate_limited',
]);

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
  const dispatch = useDispatch();
  const { toastRef } = useContext(ToastContext);
  const { colors } = useTheme();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const registerReferee = useRegisterMoneyReferee();

  const trackReferral = useCallback(
    (
      referralCode: string,
      properties:
        | { interaction_type: 'accepted' }
        | {
            interaction_type: 'refused';
            refusal_reason: ReferralRefusalReason;
          },
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

  const showReferralFailed = useCallback(
    (description: string) => {
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        iconName: ComponentLibraryIconName.Danger,
        iconColor: colors.error.default,
        labelOptions: [
          {
            label: strings('social_leaderboard.trader_preview.referral_failed'),
            isBold: true,
          },
        ],
        descriptionOptions: { description },
        hasNoTimeout: false,
      });
    },
    [colors, toastRef],
  );

  const acceptReferral = useCallback(
    async (referralCode: string) => {
      const result = await registerReferee(referralCode);
      if (result.status === 'accepted') {
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
        return;
      }

      const refusalReason =
        result.status === 'invalid'
          ? 'invalid_code'
          : getRegisterRefereeRefusalReason(result.error);
      DevLogger.log(`${LOG_PREFIX} Failed to accept the referral:`, {
        referralCode,
        refusalReason,
      });
      trackReferral(referralCode, {
        interaction_type: 'refused',
        refusal_reason: refusalReason,
      });
      if (RETRYABLE_REFUSAL_REASONS.has(refusalReason)) {
        dispatch(releaseAnsweredReferralCode(referralCode));
      }
      showReferralFailed(
        result.status === 'invalid'
          ? result.message
          : getRegisterRefereeErrorTitle(result.error),
      );
    },
    [
      colors,
      dispatch,
      registerReferee,
      showReferralFailed,
      toastRef,
      trackReferral,
    ],
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
        openSharedPositionOnProfile(target.positionId, target.traderId);
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
