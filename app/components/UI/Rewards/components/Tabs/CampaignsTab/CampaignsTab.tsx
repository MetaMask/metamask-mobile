import React from 'react';
import { ActivityIndicator } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import {
  Box,
  Text,
  TextVariant,
  BoxFlexDirection,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../locales/i18n';
import { useRewardCampaigns } from '../../../hooks/useRewardCampaigns';
import { Skeleton } from '../../../../../../component-library/components/Skeleton';
import RewardsErrorBanner from '../../RewardsErrorBanner';
import { REWARDS_VIEW_SELECTORS } from '../../../Views/RewardsView.constants';
import CampaignsGroup from './CampaignsGroup';

interface CampaignsTabProps {
  tabLabel?: string;
}

/**
 * CampaignsTab displays all campaigns organized by status:
 * - Active
 * - Upcoming
 * - Previous (complete)
 */
export const CampaignsTab: React.FC<CampaignsTabProps> = () => {
  const tw = useTailwind();
  const { categorizedCampaigns, isLoading, hasError, fetchCampaigns } =
    useRewardCampaigns();

  const { active, upcoming, previous } = categorizedCampaigns;
  const hasCampaigns =
    active.length > 0 || upcoming.length > 0 || previous.length > 0;

  const renderContent = () => {
    if (isLoading && !hasCampaigns) {
      return (
        <Box twClassName="gap-6">
          <Box twClassName="gap-3">
            <Skeleton style={tw.style('h-6 w-20 rounded bg-muted')} />
            <Skeleton style={tw.style('h-50 rounded-xl bg-muted')} />
          </Box>
          <Box twClassName="gap-3">
            <Skeleton style={tw.style('h-6 w-24 rounded bg-muted')} />
            <Skeleton style={tw.style('h-50 rounded-xl bg-muted')} />
          </Box>
        </Box>
      );
    }

    if (hasError && !hasCampaigns) {
      return (
        <RewardsErrorBanner
          title={strings('rewards.campaigns_tab.error_title')}
          description={strings('rewards.campaigns_tab.error_description')}
          onConfirm={fetchCampaigns}
          confirmButtonLabel={strings('rewards.campaigns_tab.retry_button')}
        />
      );
    }

    if (!hasCampaigns) {
      return (
        <Box twClassName="items-center justify-center py-12">
          <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
            {strings('rewards.campaigns_tab.empty_state')}
          </Text>
        </Box>
      );
    }

    return (
      <Box twClassName="gap-6">
        <CampaignsGroup
          title={strings('rewards.campaigns_tab.active_title')}
          campaigns={active}
          testID={REWARDS_VIEW_SELECTORS.CAMPAIGNS_ACTIVE_SECTION}
        />

        <CampaignsGroup
          title={strings('rewards.campaigns_tab.upcoming_title')}
          campaigns={upcoming}
          testID={REWARDS_VIEW_SELECTORS.CAMPAIGNS_UPCOMING_SECTION}
        />

        <CampaignsGroup
          title={strings('rewards.campaigns_tab.previous_title')}
          campaigns={previous}
          testID={REWARDS_VIEW_SELECTORS.CAMPAIGNS_PREVIOUS_SECTION}
        />
      </Box>
    );
  };

  return (
    <ScrollView
      contentContainerStyle={tw.style('flex-grow p-4')}
      showsVerticalScrollIndicator={false}
      testID={REWARDS_VIEW_SELECTORS.TAB_CONTENT_CAMPAIGNS}
    >
      {isLoading && hasCampaigns && (
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="mb-4 gap-2"
        >
          <ActivityIndicator size="small" />
          <Text variant={TextVariant.BodySm} twClassName="text-alternative">
            {strings('rewards.campaigns_tab.refreshing')}
          </Text>
        </Box>
      )}

      {renderContent()}
    </ScrollView>
  );
};
