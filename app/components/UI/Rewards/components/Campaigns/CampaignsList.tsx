import React from 'react';
import { ActivityIndicator } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Skeleton,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { useRewardCampaigns } from '../../hooks/useRewardCampaigns';
import { useOndoOutcomeToast } from '../../hooks/useOndoOutcomeToast';
import { usePerpsTradingCampaignEndedOutcomeToast } from '../../hooks/usePerpsTradingCampaignEndedOutcomeToast';
import { useGetPredictThePitchOutcomeToast } from '../../hooks/useGetPredictThePitchOutcomeToast';
import { useMoneyAccountSweepstakesOutcomeToast } from '../../hooks/useMoneyAccountSweepstakesOutcomeToast';
import { REWARDS_VIEW_SELECTORS } from '../../Views/RewardsView.constants';
import RewardsErrorBanner from '../RewardsErrorBanner';
import CampaignsGroup from './CampaignsGroup';

/**
 * Every campaign, grouped as Active, Upcoming and Previous, with its own
 * loading, error and empty states.
 *
 * It does not scroll or pad itself. The Campaigns screen and the Rewards
 * Campaigns tab each place it inside their own scroller.
 */
const CampaignsList: React.FC = () => {
  const tw = useTailwind();
  const {
    categorizedCampaigns,
    isLoading,
    hasError,
    hasLoaded,
    fetchCampaigns,
  } = useRewardCampaigns();
  useOndoOutcomeToast();
  usePerpsTradingCampaignEndedOutcomeToast();
  useGetPredictThePitchOutcomeToast();
  useMoneyAccountSweepstakesOutcomeToast();

  const { active, upcoming, previous } = categorizedCampaigns;
  const hasCampaigns =
    active.length > 0 || upcoming.length > 0 || previous.length > 0;

  if (!hasCampaigns) {
    // Until the first read settles, an empty list is "not known yet". The
    // read starts after mount, so `isLoading` alone misses the first frame.
    if (isLoading || !hasLoaded) {
      return (
        <Box className="gap-6">
          <Box className="gap-3">
            <Skeleton style={tw.style('h-6 w-24 rounded bg-muted')} />
            <Skeleton style={tw.style('h-50 rounded-xl bg-muted')} />
          </Box>
          <Box className="gap-3">
            <Skeleton style={tw.style('h-6 w-24 rounded bg-muted')} />
            <Skeleton style={tw.style('h-50 rounded-xl bg-muted')} />
          </Box>
        </Box>
      );
    }

    if (hasError) {
      return (
        <RewardsErrorBanner
          title={strings('rewards.campaigns_view.error_title')}
          description={strings('rewards.campaigns_view.error_description')}
          onConfirm={() => {
            void fetchCampaigns();
          }}
          confirmButtonLabel={strings('rewards.campaigns_view.retry_button')}
        />
      );
    }

    return (
      <Box className="items-center justify-center py-12">
        <Text variant={TextVariant.BodyMd} className="text-alternative">
          {strings('rewards.campaigns_view.empty_state')}
        </Text>
      </Box>
    );
  }

  return (
    <>
      {isLoading ? (
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          className="mb-4 gap-2"
        >
          <ActivityIndicator size="small" />
          <Text variant={TextVariant.BodySm} className="text-alternative">
            {strings('rewards.campaigns_view.refreshing')}
          </Text>
        </Box>
      ) : null}
      <Box className="gap-6">
        <CampaignsGroup
          title={strings('rewards.campaigns_view.active_title')}
          campaigns={active}
          testID={REWARDS_VIEW_SELECTORS.CAMPAIGNS_ACTIVE_SECTION}
        />
        <CampaignsGroup
          title={strings('rewards.campaigns_view.upcoming_title')}
          campaigns={upcoming}
          testID={REWARDS_VIEW_SELECTORS.CAMPAIGNS_UPCOMING_SECTION}
        />
        <CampaignsGroup
          title={strings('rewards.campaigns_view.previous_title')}
          campaigns={previous}
          testID={REWARDS_VIEW_SELECTORS.CAMPAIGNS_PREVIOUS_SECTION}
        />
      </Box>
    </>
  );
};

export default CampaignsList;
