import React from 'react';
import { ActivityIndicator } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import useTrackRewardsPageView from '../hooks/useTrackRewardsPageView';
import {
  Box,
  Text,
  TextVariant,
  BoxFlexDirection,
  BoxAlignItems,
  Skeleton,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';
import { useRewardCampaigns } from '../hooks/useRewardCampaigns';
import RewardsErrorBanner from '../components/RewardsErrorBanner';
import { REWARDS_VIEW_SELECTORS } from './RewardsView.constants';
import CampaignsGroup from '../components/Campaigns/CampaignsGroup';
import { strings } from '../../../../../locales/i18n';

/**
 * CampaignsView displays all campaigns organized by status:
 * - Active
 * - Upcoming
 * - Previous (complete)
 */
const CampaignsView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const { categorizedCampaigns, isLoading, hasError, fetchCampaigns } =
    useRewardCampaigns();

  useTrackRewardsPageView({ page_type: 'campaigns_overview' });

  const { active, upcoming, previous } = categorizedCampaigns;
  const hasCampaigns =
    active.length > 0 || upcoming.length > 0 || previous.length > 0;

  const renderContent = () => {
    if (isLoading && !hasCampaigns) {
      return (
        <Box twClassName="gap-6">
          <Box twClassName="gap-3">
            <Skeleton style={tw.style('h-6 w-24 rounded bg-muted')} />
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
          title={strings('rewards.campaigns_view.error_title')}
          description={strings('rewards.campaigns_view.error_description')}
          onConfirm={fetchCampaigns}
          confirmButtonLabel={strings('rewards.campaigns_view.retry_button')}
        />
      );
    }

    if (!hasCampaigns) {
      return (
        <Box twClassName="items-center justify-center py-12">
          <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
            {strings('rewards.campaigns_view.empty_state')}
          </Text>
        </Box>
      );
    }

    return (
      <Box twClassName="gap-6">
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
    );
  };

  return (
    <ErrorBoundary navigation={navigation} view="CampaignsView">
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={REWARDS_VIEW_SELECTORS.CAMPAIGNS_VIEW}
      >
        <HeaderCompactStandard
          title={strings('rewards.campaigns_view.title')}
          onBack={() => navigation.goBack()}
          backButtonProps={{ testID: 'header-back-button' }}
          includesTopInset
        />
        <ScrollView
          contentContainerStyle={tw.style('flex-grow p-4')}
          showsVerticalScrollIndicator={false}
        >
          {isLoading && hasCampaigns && (
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="mb-4 gap-2"
            >
              <ActivityIndicator size="small" />
              <Text variant={TextVariant.BodySm} twClassName="text-alternative">
                {strings('rewards.campaigns_view.refreshing')}
              </Text>
            </Box>
          )}

          {renderContent()}
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default CampaignsView;
