import { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { handleDeeplink } from '../../../../core/DeeplinkManager';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';
import { CampaignType } from '../../../../core/Engine/controllers/rewards-controller/types';
import {
  selectCampaignsFetching,
  selectPendingDeeplink,
} from '../../../../reducers/rewards/selectors';
import { setPendingDeeplink } from '../../../../reducers/rewards';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { getLatestActiveCampaignOfType } from '../components/Campaigns/CampaignTile.utils';
import { navigateToRewardsRoute } from '../utils';
import { resolveMoneyAccountSweepstakesEntryRoute } from '../utils/moneyAccountSweepstakesSeries';
import { useMoneyAccountSweepstakesSeries } from './useMoneyAccountSweepstakesSeries';
import { useRewardCampaigns } from './useRewardCampaigns';

const MUSD_MONEY_URL = 'metamask://money';

/**
 * Consumes a rewards deeplink stored in Redux and opens the matching sub-page.
 *
 * Lives on RewardsHome rather than either dashboard. RewardsHome mounts only
 * one of RewardsDashboard or RewardsMoneyDashboard, so a hook on a single
 * sibling would drop the deeplink for the other home. The inner stack remounts
 * when the Money persona resolves; this parent hook keeps the pending deeplink
 * across that remount.
 *
 * @param enabled - When false, leave the pending deeplink untouched. Onboarding
 * and the update-required screen pass false so they do not push a campaign.
 */
export const useRewardsPendingDeeplink = ({
  enabled,
}: {
  enabled: boolean;
}): void => {
  const navigation = useNavigation<AppNavigationProp>();
  const dispatch = useDispatch();
  const pendingDeeplink = useSelector(selectPendingDeeplink);
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const {
    campaigns,
    hasLoaded: campaignsHasLoaded,
    hasError: campaignsHasError,
    isLoading: isCampaignsLoading,
  } = useRewardCampaigns();
  const isCampaignsFetching = useSelector(selectCampaignsFetching);
  // `campaignsFetching` is dispatched by the focus effect, so it only becomes
  // readable one render later — on the first commit after a (re)mount the
  // deeplink effect below always sees `false`, even though a fetch is already
  // under way. Waiting until a fetch has actually been *observed* closes that
  // window without depending on the order the two effects happen to run in.
  const hasObservedCampaignsFetchRef = useRef(false);
  useEffect(() => {
    if (isCampaignsFetching) {
      hasObservedCampaignsFetchRef.current = true;
    }
  }, [isCampaignsFetching]);
  const moneyAccountSeries = useMoneyAccountSweepstakesSeries();

  useEffect(() => {
    if (!enabled || !pendingDeeplink) {
      return;
    }

    let handled = true;
    if (pendingDeeplink.page === 'campaigns') {
      navigateToRewardsRoute(navigation, Routes.REWARDS_CAMPAIGNS_VIEW);
    } else if (pendingDeeplink.campaign === 'ondo') {
      navigateToRewardsRoute(
        navigation,
        Routes.REWARDS_ONDO_CAMPAIGN_DETAILS_VIEW,
      );
    } else if (pendingDeeplink.campaign === 'season1') {
      navigateToRewardsRoute(
        navigation,
        Routes.REWARDS_SEASON_ONE_CAMPAIGN_DETAILS_VIEW,
      );
    } else if (pendingDeeplink.campaign === 'perps-comp') {
      // The deeplink carries no campaign id, so it has to be resolved against
      // the campaign list — and resolving against a list that is not yet
      // authoritative would drop the deeplink for good, because a null result
      // still counts as handled. The list is only authoritative once every one
      // of these is false:
      //  - no subscription yet: fetchCampaigns short-circuits to an empty list
      //    and still marks it loaded, so "no campaigns" means "not signed in",
      //    not "no campaigns exist".
      //  - no fetch observed yet this mount: the list in Redux survives the
      //    tab unmounting, so it can be a previous fetch's result that the
      //    in-flight refresh has not replaced yet.
      //  - a fetch is in flight: campaignsLoading is suppressed once campaigns
      //    exist, so only campaignsFetching catches a refresh over a stale list.
      //  - never loaded, or failed/in-flight with nothing cached.
      const waitingForCampaigns =
        !subscriptionId ||
        !hasObservedCampaignsFetchRef.current ||
        isCampaignsFetching ||
        !campaignsHasLoaded ||
        (campaigns.length === 0 && (campaignsHasError || isCampaignsLoading));

      if (waitingForCampaigns) {
        handled = false;
      } else {
        const perpsCampaign = getLatestActiveCampaignOfType(
          campaigns,
          CampaignType.PERPS_TRADING,
        );
        if (perpsCampaign) {
          navigateToRewardsRoute(
            navigation,
            Routes.REWARDS_PERPS_TRADING_CAMPAIGN_DETAILS_VIEW,
            { campaignId: perpsCampaign.id },
          );
        }
        // No running perps campaign: stay on the home. Navigating would
        // surface a past campaign, or an upcoming one whose details page has
        // nothing to show yet.
      }
    } else if (pendingDeeplink.campaign === 'predict-the-pitch') {
      navigateToRewardsRoute(
        navigation,
        Routes.REWARDS_PREDICT_THE_PITCH_CAMPAIGN_DETAILS_VIEW,
      );
    } else if (pendingDeeplink.campaign === 'money') {
      // Failed and in-flight fetches also flip campaignsHasLoaded, so an empty
      // series is only trustworthy once a successful fetch has settled.
      const waitingForCampaigns =
        !campaignsHasLoaded ||
        (moneyAccountSeries.campaigns.length === 0 &&
          (campaignsHasError || isCampaignsLoading));

      if (waitingForCampaigns) {
        handled = false;
      } else {
        const entry = resolveMoneyAccountSweepstakesEntryRoute({
          series: moneyAccountSeries,
        });

        if (entry.kind === 'details') {
          navigateToRewardsRoute(
            navigation,
            Routes.REWARDS_MONEY_ACCOUNT_SWEEPSTAKES_CAMPAIGN_DETAILS_VIEW,
            { campaignId: entry.campaignId },
          );
        }
        // entry.kind === 'dashboard': stay on the home (upcoming / empty)
      }
    } else if (pendingDeeplink.page === 'musd') {
      handleDeeplink({ uri: MUSD_MONEY_URL });
    } else if (pendingDeeplink.page === 'benefits') {
      // Benefits full view is registered at the root MainNavigator level.
      navigation.navigate(Routes.REWARD_BENEFITS_FULL_VIEW);
    } else {
      // Unrecognized page/campaign: do not clear the pending deeplink so the
      // intent is preserved and can be retried, rather than silently dropped.
      handled = false;
    }

    if (handled) {
      dispatch(setPendingDeeplink(null));
    }
  }, [
    enabled,
    navigation,
    dispatch,
    pendingDeeplink,
    subscriptionId,
    campaigns,
    campaignsHasLoaded,
    campaignsHasError,
    isCampaignsLoading,
    isCampaignsFetching,
    moneyAccountSeries,
  ]);
};
