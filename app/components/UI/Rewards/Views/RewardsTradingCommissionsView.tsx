import React from 'react';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box, HeaderStandard } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import { KOL_PERFORMANCE_FIXTURE } from '../components/KolDashboard/rewardsUiFixtures';
import { PerformanceCommissionRow } from '../components/KolDashboard/PerformanceActivityRows';
import { KOL_DASHBOARD_SELECTORS } from '../components/KolDashboard/KolDashboard.testIds';

const RewardsTradingCommissionsView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();

  return (
    <ErrorBoundary navigation={navigation} view="RewardsTradingCommissionsView">
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={KOL_DASHBOARD_SELECTORS.TRADING_COMMISSIONS_VIEW}
      >
        <HeaderStandard
          title={strings('rewards.kol.trading_commissions_section')}
          onBack={() => navigation.goBack()}
          backButtonProps={{ testID: 'header-back-button' }}
          includesTopInset
        />
        <ScrollView showsVerticalScrollIndicator={false}>
          <Box twClassName="gap-4 px-4 pb-8">
            {KOL_PERFORMANCE_FIXTURE.commissions.map((item) => (
              <PerformanceCommissionRow key={item.id} item={item} />
            ))}
          </Box>
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default RewardsTradingCommissionsView;
