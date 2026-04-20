import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  useFocusEffect,
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';
import { markCampaignEndToastShown } from '../../../../reducers/rewards';
import {
  selectCampaigns,
  selectCampaignsHasLoaded,
  selectHasShownCampaignEndToast,
} from '../../../../reducers/rewards/selectors';
import {
  selectCampaignParticipantOptedIn,
  selectRewardsSubscriptionId,
} from '../../../../selectors/rewards';
import {
  CampaignType,
  type CampaignLeaderboardPositionDto,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import { getCampaignStatus } from '../components/Campaigns/CampaignTile.utils';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import useRewardsToast from './useRewardsToast';
import { useGetOndoLeaderboardPosition } from './useGetOndoLeaderboardPosition';

const DEBOUNCE_MS = 400;

/**
 * Whether the user is an Ondo campaign end winner (top ranks with qualification met).
 */
export function isOndoCampaignWinner(
  position: CampaignLeaderboardPositionDto | null,
): boolean {
  if (!position) {
    return false;
  }
  return position.rank <= 5 && position.qualified === true;
}

/**
 * When the user is in the Rewards area, may show a one-time end-of-campaign toast
 * for a completed ONDO_HOLDING campaign (first matching `complete` in the list; opted in + leaderboard settled).
 */
export function useMaybeShowCampaignEndToast(): void {
  const dispatch = useDispatch();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const campaigns = useSelector(selectCampaigns);
  const campaignsHasLoaded = useSelector(selectCampaignsHasLoaded);
  const { showToast, RewardsToastOptions } = useRewardsToast();
  const lastRunAtRef = useRef(0);
  /** Prevents calling `showToast` again on every focus before the user taps View. */
  const hasPresentedCampaignEndToastRef = useRef(false);

  const ondoCampaign = useMemo(
    () =>
      campaigns.find(
        (c) =>
          c.type === CampaignType.ONDO_HOLDING &&
          getCampaignStatus(c) === 'complete',
      ) ?? null,
    [campaigns],
  );

  const campaignId = ondoCampaign?.id;
  const hasShownToast = useSelector(selectHasShownCampaignEndToast(campaignId));
  const isOptedIn = useSelector(
    selectCampaignParticipantOptedIn(subscriptionId, campaignId),
  );

  const { position, hasFetched, hasError } =
    useGetOndoLeaderboardPosition(campaignId);

  const navigateToOndoDetails = useCallback(() => {
    if (!campaignId) {
      return;
    }
    navigation.navigate(Routes.REWARDS_ONDO_CAMPAIGN_DETAILS_VIEW, {
      campaignId,
    });
  }, [navigation, campaignId]);

  const navigateToOndoWinningScreen = useCallback(() => {
    if (!campaignId) {
      return;
    }
    navigation.navigate(Routes.REWARDS_ONDO_CAMPAIGN_WINNING_VIEW, {
      campaignId,
      campaignName: ondoCampaign?.name ?? '',
    });
  }, [navigation, campaignId, ondoCampaign?.name]);

  const onCampaignEndWinnerLinkPress = useCallback(() => {
    if (campaignId) {
      dispatch(markCampaignEndToastShown(campaignId));
    }
    navigateToOndoWinningScreen();
  }, [campaignId, dispatch, navigateToOndoWinningScreen]);

  const onCampaignEndEndedLinkPress = useCallback(() => {
    if (campaignId) {
      dispatch(markCampaignEndToastShown(campaignId));
    }
    navigateToOndoDetails();
  }, [campaignId, dispatch, navigateToOndoDetails]);

  useEffect(() => {
    hasPresentedCampaignEndToastRef.current = false;
  }, [campaignId]);

  const runCheck = useCallback(() => {
    const now = Date.now();
    if (now - lastRunAtRef.current < DEBOUNCE_MS) {
      return;
    }
    lastRunAtRef.current = now;

    if (
      !subscriptionId ||
      !campaignsHasLoaded ||
      !ondoCampaign ||
      !campaignId
    ) {
      return;
    }

    if (!isOptedIn) {
      return;
    }

    if (hasShownToast) {
      return;
    }

    if (hasPresentedCampaignEndToastRef.current) {
      return;
    }

    if (!hasFetched || hasError) {
      return;
    }

    const campaignName = ondoCampaign.name ?? '';
    const viewLabel = strings('rewards.campaign_end_toast.view');

    if (isOndoCampaignWinner(position)) {
      showToast(
        RewardsToastOptions.campaignWon(
          strings('rewards.campaign_end_toast.won_title', {
            campaignName,
          }),
          strings('rewards.campaign_end_toast.won_description'),
          viewLabel,
          onCampaignEndWinnerLinkPress,
        ),
      );
    } else {
      showToast(
        RewardsToastOptions.campaignEnded(
          strings('rewards.campaign_end_toast.ended_title', {
            campaignName,
          }),
          strings('rewards.campaign_end_toast.ended_description'),
          viewLabel,
          onCampaignEndEndedLinkPress,
        ),
      );
    }
    hasPresentedCampaignEndToastRef.current = true;
  }, [
    subscriptionId,
    campaignsHasLoaded,
    ondoCampaign,
    campaignId,
    isOptedIn,
    hasShownToast,
    hasFetched,
    hasError,
    position,
    showToast,
    RewardsToastOptions,
    onCampaignEndWinnerLinkPress,
    onCampaignEndEndedLinkPress,
  ]);

  useFocusEffect(
    useCallback(() => {
      runCheck();
    }, [runCheck]),
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener('state', () => {
      runCheck();
    });
    return unsubscribe;
  }, [navigation, runCheck]);
}
