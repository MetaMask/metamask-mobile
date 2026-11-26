import React from 'react';
import { ScrollView } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import useTrackRewardsPageView from '../hooks/useTrackRewardsPageView';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import { REWARDS_VIEW_SELECTORS } from './RewardsView.constants';
import CampaignsList from '../components/Campaigns/CampaignsList';
import { strings } from '../../../../../locales/i18n';
import HeaderStandardGlass from '../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../selectors/featureFlagController/glassHeaders';

/**
 * CampaignsView displays all campaigns organized by status:
 * - Active
 * - Upcoming
 * - Previous (complete)
 */
const CampaignsView: React.FC = () => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();

  useTrackRewardsPageView({ page_type: 'campaigns_overview' });

  return (
    <ErrorBoundary navigation={navigation} view="CampaignsView">
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={REWARDS_VIEW_SELECTORS.CAMPAIGNS_VIEW}
      >
        <HeaderStandardGlass
          isGlass={isGlassHeader}
          isFloating={false}
          title={strings('rewards.campaigns_view.title')}
          onBack={() => navigation.goBack()}
          backButtonProps={{ testID: 'header-back-button' }}
          includesTopInset
        />
        <ScrollView
          contentContainerStyle={tw.style('flex-grow p-4')}
          showsVerticalScrollIndicator={false}
        >
          <CampaignsList />
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default CampaignsView;
