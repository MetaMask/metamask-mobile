import { useCallback, useContext, useMemo } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import { ToastContext } from '../../../../component-library/components/Toast';
import {
  ButtonIconVariant,
  ToastVariants,
} from '../../../../component-library/components/Toast/Toast.types';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { useAppThemeFromContext } from '../../../../util/theme';
import { CampaignType } from '../../../../core/Engine/controllers/rewards-controller/types';
import { getCampaignStatus } from '../components/Campaigns/CampaignTile.utils';
import { dismissCampaignOutcomeToast } from '../../../../reducers/rewards';
import {
  selectCampaigns,
  selectDismissedCampaignOutcomeToasts,
} from '../../../../reducers/rewards/selectors';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { useOndoCampaignParticipantOutcome } from './useOndoCampaignParticipantOutcome';

export type OutcomeToastVariant = 'winner_verify' | 'participant_no_winner';

export function useOndoOutcomeToast(): void {
  const dispatch = useDispatch();
  const { toastRef } = useContext(ToastContext);
  const theme = useAppThemeFromContext();
  const navigation = useNavigation();

  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const campaigns = useSelector(selectCampaigns);
  const dismissed = useSelector(selectDismissedCampaignOutcomeToasts);

  const targetCampaign = useMemo(() => {
    const completed = campaigns
      .filter(
        (c) =>
          c.type === CampaignType.ONDO_HOLDING &&
          getCampaignStatus(c) === 'complete',
      )
      .sort(
        (a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime(),
      );
    return completed[0] ?? null;
  }, [campaigns]);

  const { outcome } = useOndoCampaignParticipantOutcome(targetCampaign?.id);

  const variant = useMemo((): OutcomeToastVariant | null => {
    if (!outcome) return null;
    if (
      outcome.winnerVerificationCode &&
      outcome.outcomeStatus !== 'finalized'
    ) {
      return 'winner_verify';
    }
    if (
      outcome.outcomeStatus === 'finalized' &&
      !outcome.winnerVerificationCode
    ) {
      return 'participant_no_winner';
    }
    return null;
  }, [outcome]);

  const isDismissed = useMemo(() => {
    if (!variant || !targetCampaign || !subscriptionId) return true;
    const key = `${targetCampaign.id}:${subscriptionId}:${variant}`;
    return dismissed[key] === true;
  }, [variant, targetCampaign, subscriptionId, dismissed]);

  const handleDismiss = useCallback(() => {
    if (!variant || !targetCampaign || !subscriptionId) return;
    dispatch(
      dismissCampaignOutcomeToast({
        campaignId: targetCampaign.id,
        subscriptionId,
        variant,
      }),
    );
    toastRef?.current?.closeToast();
  }, [variant, targetCampaign, subscriptionId, dispatch, toastRef]);

  const handleCta = useCallback(() => {
    if (!targetCampaign || !variant) return;
    handleDismiss();
    if (variant === 'winner_verify') {
      navigation.navigate(Routes.REWARDS_ONDO_CAMPAIGN_WINNING_VIEW, {
        campaignId: targetCampaign.id,
      });
    } else {
      navigation.navigate(Routes.REWARDS_ONDO_CAMPAIGN_DETAILS_VIEW, {
        campaignId: targetCampaign.id,
      });
    }
  }, [variant, targetCampaign, handleDismiss, navigation]);

  useFocusEffect(
    useCallback(() => {
      if (!variant || isDismissed || !targetCampaign) return;

      const isWinner = variant === 'winner_verify';
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        iconName: isWinner ? IconName.Star : IconName.Info,
        iconColor: isWinner
          ? theme.colors.warning.default
          : theme.colors.success.default,
        backgroundColor: 'transparent',
        hasNoTimeout: true,
        labelOptions: [
          {
            label: strings(`rewards.ondo_outcome_toast.${variant}.title`),
            isBold: true,
          },
        ],
        descriptionOptions: {
          description: strings(
            `rewards.ondo_outcome_toast.${variant}.description`,
            { campaignName: targetCampaign.name },
          ),
        },
        linkButtonOptions: {
          label: strings(`rewards.ondo_outcome_toast.${variant}.cta`),
          onPress: handleCta,
        },
        closeButtonOptions: {
          variant: ButtonIconVariant.Icon,
          iconName: IconName.Close,
          onPress: handleDismiss,
        },
      });
      notificationAsync(
        isWinner
          ? NotificationFeedbackType.Success
          : NotificationFeedbackType.Warning,
      );

      return () => {
        toastRef?.current?.closeToast();
      };
    }, [
      variant,
      isDismissed,
      targetCampaign,
      toastRef,
      theme.colors.warning.default,
      theme.colors.success.default,
      handleCta,
      handleDismiss,
    ]),
  );
}

export default useOndoOutcomeToast;
