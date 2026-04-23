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
import { CampaignType } from '../../../../core/Engine/controllers/rewards-controller/types';
import { getCampaignStatus } from '../components/Campaigns/CampaignTile.utils';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import {
  selectCampaigns,
  selectCampaignParticipantStatus,
  selectIsCampaignOutcomeToastDismissed,
} from '../../../../reducers/rewards/selectors';
import { dismissCampaignOutcomeToast } from '../../../../reducers/rewards';
import useRewardsToast from './useRewardsToast';
import { useOndoCampaignParticipantOutcome } from './useOndoCampaignParticipantOutcome';

export function useOndoCampaignEndedOutcomeToast(): void {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const theme = useAppThemeFromContext();
  const { toastRef } = useContext(ToastContext);
  const { showToast } = useRewardsToast();

  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const campaigns = useSelector(selectCampaigns);

  const campaign =
    subscriptionId && campaigns
      ? (campaigns
          .filter(
            (c) =>
              c.type === CampaignType.ONDO_HOLDING &&
              getCampaignStatus(c) === 'complete',
          )
          .sort(
            (a, b) =>
              new Date(b.endDate).getTime() - new Date(a.endDate).getTime(),
          )[0] ?? null)
      : null;

  const campaignId = campaign?.id;
  const isOptedIn =
    useSelector(selectCampaignParticipantStatus(subscriptionId, campaignId))
      ?.optedIn === true;

  const isEligible =
    Boolean(subscriptionId) && Boolean(campaignId) && isOptedIn;

  const { outcome } = useOndoCampaignParticipantOutcome(
    isEligible ? campaignId : undefined,
  );

  const outcomeVariant = outcome
    ? outcome.winnerVerificationCode && outcome.outcomeStatus === 'pending'
      ? 'winner_pending'
      : !outcome.winnerVerificationCode && outcome.outcomeStatus === 'finalized'
        ? 'participant_finalized'
        : undefined
    : undefined;

  const toastKey =
    subscriptionId && campaignId && outcomeVariant
      ? `${subscriptionId}:${campaignId}:${outcomeVariant}`
      : '';
  const isDismissed = useSelector(
    selectIsCampaignOutcomeToastDismissed(
      subscriptionId ?? undefined,
      campaignId,
      outcomeVariant,
    ),
  );

  const shownVariantsRef = useRef(new Set<string>());

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
      !outcomeVariant ||
      isDismissed ||
      shownVariantsRef.current.has(outcomeVariant) ||
      !campaignId
    ) {
      return;
    }

    const resolvedCampaignId: string = campaignId;
    const hasCode = Boolean(outcome.winnerVerificationCode);
    const isFinalized = outcome.outcomeStatus === 'finalized';
    const isPending = outcome.outcomeStatus === 'pending';

    if (isFinalized && !hasCode) {
      shownVariantsRef.current.add('participant_finalized');
      showToast({
        variant: ToastVariants.Icon,
        iconName: IconName.Confirmation,
        iconColor: theme.colors.success.default,
        backgroundColor: 'transparent',
        hasNoTimeout: true,
        hapticsType: NotificationFeedbackType.Success,
        labelOptions: [
          {
            label: strings(
              'rewards.ondo_outcome_toast.participant_finalized.title',
            ),
            isBold: true,
          },
        ],
        descriptionOptions: {
          description: strings(
            'rewards.ondo_outcome_toast.participant_finalized.description',
            { campaignName: campaign?.name ?? '' },
          ),
        },
        linkButtonOptions: {
          label: strings(
            'rewards.ondo_outcome_toast.participant_finalized.view',
          ),
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
      shownVariantsRef.current.add('winner_pending');
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
            { campaignName: campaign?.name ?? '' },
          ),
        },
        linkButtonOptions: {
          label: strings(
            'rewards.ondo_outcome_toast.winner_pending.view_details',
          ),
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
    outcomeVariant,
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
