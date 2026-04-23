import { useCallback, useContext, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { NotificationFeedbackType } from 'expo-haptics';
import { ToastContext } from '../../../../component-library/components/Toast';
import {
  ButtonIconVariant,
  ToastVariants,
} from '../../../../component-library/components/Toast/Toast.types';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { useAppThemeFromContext } from '../../../../util/theme';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import {
  CampaignType,
  CampaignDto,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import { getCampaignStatus } from '../components/Campaigns/CampaignTile.utils';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import {
  selectOndoCampaignParticipantOutcomeById,
  selectIsCampaignOutcomeToastDismissed,
} from '../../../../reducers/rewards/selectors';
import { dismissCampaignOutcomeToast } from '../../../../reducers/rewards';
import useRewardsToast from './useRewardsToast';

export function useOndoCampaignEndedOutcomeToast(
  campaignId: string | undefined,
  campaign: CampaignDto | null,
): void {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const theme = useAppThemeFromContext();
  const { toastRef } = useContext(ToastContext);
  const { showToast } = useRewardsToast();

  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const outcome = useSelector(
    selectOndoCampaignParticipantOutcomeById(
      subscriptionId ?? undefined,
      campaignId,
    ),
  );
  const toastKey =
    subscriptionId && campaignId ? `${subscriptionId}:${campaignId}` : '';
  const isDismissed = useSelector(
    selectIsCampaignOutcomeToastDismissed(
      subscriptionId ?? '',
      campaignId ?? '',
    ),
  );

  const hasShownRef = useRef(false);

  const isEligible =
    campaign?.type === CampaignType.ONDO_HOLDING &&
    getCampaignStatus(campaign) === 'complete' &&
    Boolean(subscriptionId) &&
    Boolean(campaignId);

  const handleDismiss = useCallback(() => {
    toastRef?.current?.closeToast();
    if (toastKey) {
      dispatch(dismissCampaignOutcomeToast(toastKey));
    }
  }, [dispatch, toastKey, toastRef]);

  useEffect(() => {
    if (
      !isEligible ||
      !outcome ||
      isDismissed ||
      hasShownRef.current ||
      !campaignId
    ) {
      return;
    }

    const resolvedCampaignId: string = campaignId;
    const hasCode = Boolean(outcome.winnerVerificationCode);
    const isFinalized = outcome.outcomeStatus === 'finalized';
    const isPending = outcome.outcomeStatus === 'pending';

    if (isFinalized && !hasCode) {
      hasShownRef.current = true;
      showToast({
        variant: ToastVariants.Icon,
        iconName: IconName.Confirmation,
        iconColor: theme.colors.success.default,
        backgroundColor: 'transparent',
        hasNoTimeout: true,
        hapticsType: NotificationFeedbackType.Success,
        labelOptions: [
          {
            label: strings('rewards.ondo_outcome_toast.loser_finalized.title'),
            isBold: true,
          },
        ],
        descriptionOptions: {
          description: strings(
            'rewards.ondo_outcome_toast.loser_finalized.description',
          ),
        },
        linkButtonOptions: {
          label: strings('rewards.ondo_outcome_toast.view'),
          onPress: () => {
            navigation.navigate(Routes.REWARDS_ONDO_CAMPAIGN_LEADERBOARD, {
              campaignId: resolvedCampaignId,
            });
          },
        },
        closeButtonOptions: {
          variant: ButtonIconVariant.Icon,
          iconName: IconName.Close,
          onPress: handleDismiss,
        },
      });
    } else if (isPending && hasCode) {
      hasShownRef.current = true;
      showToast({
        variant: ToastVariants.Icon,
        iconName: IconName.Star,
        iconColor: theme.colors.warning.default,
        backgroundColor: 'transparent',
        hasNoTimeout: true,
        hapticsType: NotificationFeedbackType.Success,
        labelOptions: [
          {
            label: strings('rewards.ondo_outcome_toast.winner_pending.title'),
            isBold: true,
          },
        ],
        descriptionOptions: {
          description: strings(
            'rewards.ondo_outcome_toast.winner_pending.description',
          ),
        },
        linkButtonOptions: {
          label: strings('rewards.ondo_outcome_toast.view_details'),
          onPress: () => {
            navigation.navigate(Routes.REWARDS_ONDO_CAMPAIGN_WINNING_VIEW, {
              campaignId: resolvedCampaignId,
              campaignName: campaign?.name ?? '',
            });
          },
        },
        closeButtonOptions: {
          variant: ButtonIconVariant.Icon,
          iconName: IconName.Close,
          onPress: handleDismiss,
        },
      });
    }
  }, [
    isEligible,
    outcome,
    isDismissed,
    campaignId,
    campaign,
    navigation,
    showToast,
    handleDismiss,
    theme.colors.success.default,
    theme.colors.warning.default,
  ]);
}

export default useOndoCampaignEndedOutcomeToast;
