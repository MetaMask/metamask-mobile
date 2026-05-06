import { useCallback, useContext, useMemo } from 'react';
import {
  useFocusEffect,
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import { ToastContext } from '../../../../component-library/components/Toast';
import type {
  BaseCampaignParticipantOutcomeDto,
  CampaignType,
  CampaignDto,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import { getCampaignStatus } from '../components/Campaigns/CampaignTile.utils';
import { dismissCampaignOutcomeToast } from '../../../../reducers/rewards';
import {
  selectCampaigns,
  selectDismissedCampaignOutcomeToasts,
} from '../../../../reducers/rewards/selectors';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import useRewardsToast from './useRewardsToast';

export interface CampaignOutcomeToastConfig {
  campaignType: CampaignType;
  useOutcome: (id: string | undefined) => {
    outcome: BaseCampaignParticipantOutcomeDto | null;
  };
  getWinnerNavigation: (campaign: CampaignDto) => {
    route: string;
    params: object;
  };
  getNonWinnerNavigation: (campaign: CampaignDto) => {
    route: string;
    params: object;
  };
}

export function useCampaignOutcomeToast(
  config: CampaignOutcomeToastConfig,
): void {
  const {
    campaignType,
    useOutcome,
    getWinnerNavigation,
    getNonWinnerNavigation,
  } = config;

  const dispatch = useDispatch();
  const { toastRef } = useContext(ToastContext);
  const { showToast, RewardsToastOptions } = useRewardsToast();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const campaigns = useSelector(selectCampaigns);
  const dismissed = useSelector(selectDismissedCampaignOutcomeToasts);

  const targetCampaign = useMemo(() => {
    const completed = campaigns
      .filter(
        (c) => c.type === campaignType && getCampaignStatus(c) === 'complete',
      )
      .sort(
        (a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime(),
      );
    return completed[0] ?? null;
  }, [campaigns, campaignType]);

  const { outcome } = useOutcome(targetCampaign?.id);

  // Standardized variant derivation: winner = has code and not yet finalized
  const variant = useMemo((): 'winner' | 'non_winner' | null => {
    if (!outcome) return null;
    if (
      outcome.winnerVerificationCode &&
      outcome.outcomeStatus !== 'finalized'
    ) {
      return 'winner';
    }
    if (
      outcome.outcomeStatus === 'finalized' &&
      !outcome.winnerVerificationCode
    ) {
      return 'non_winner';
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
    const nav =
      variant === 'winner'
        ? getWinnerNavigation(targetCampaign)
        : getNonWinnerNavigation(targetCampaign);
    navigation.navigate(nav.route, nav.params);
  }, [
    variant,
    targetCampaign,
    handleDismiss,
    navigation,
    getWinnerNavigation,
    getNonWinnerNavigation,
  ]);

  useFocusEffect(
    useCallback(() => {
      if (!variant || isDismissed || !targetCampaign) return;

      const isWinner = variant === 'winner';
      if (isWinner) {
        showToast(
          RewardsToastOptions.outcomeWinner({
            title: strings('rewards.campaign_outcome_toast.winner.title'),
            description: strings(
              'rewards.campaign_outcome_toast.winner.description',
              { campaignName: targetCampaign.name ?? '' },
            ),
            ctaLabel: strings('rewards.campaign_outcome_toast.winner.cta'),
            onCtaPress: handleCta,
            onClosePress: handleDismiss,
          }),
        );
      } else {
        showToast(
          RewardsToastOptions.outcomeNonWinner({
            title: strings('rewards.campaign_outcome_toast.non_winner.title'),
            description: strings(
              'rewards.campaign_outcome_toast.non_winner.description',
              { campaignName: targetCampaign.name ?? '' },
            ),
            ctaLabel: strings('rewards.campaign_outcome_toast.non_winner.cta'),
            onCtaPress: handleCta,
            onClosePress: handleDismiss,
          }),
        );
      }

      return () => {
        toastRef?.current?.closeToast();
      };
    }, [
      variant,
      isDismissed,
      targetCampaign,
      toastRef,
      showToast,
      RewardsToastOptions,
      handleCta,
      handleDismiss,
    ]),
  );
}

export default useCampaignOutcomeToast;
