import React from 'react';
import { ScrollView } from 'react-native';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box, HeaderStandard } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import { getEarningsHistory } from '../components/KolDashboard/rewardsUiFixtures';
import { EarningsHistoryRow } from '../components/KolDashboard/EarningsHistoryRows';
import { KOL_DASHBOARD_SELECTORS } from '../components/KolDashboard/KolDashboard.testIds';
import type { RewardsStackParamList } from '../types/navigation';

const RewardsEarningsHistoryView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const { params } =
    useRoute<RouteProp<RewardsStackParamList, 'RewardsEarningsHistoryView'>>();
  const history = getEarningsHistory(Boolean(params?.hideReferrals));

  return (
    <ErrorBoundary navigation={navigation} view="RewardsEarningsHistoryView">
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
        testID={KOL_DASHBOARD_SELECTORS.EARNINGS_HISTORY_VIEW}
      >
        <HeaderStandard
          title={strings('rewards.kol.history')}
          onBack={() => navigation.goBack()}
          backButtonProps={{ testID: 'header-back-button' }}
          includesTopInset
        />
        <ScrollView showsVerticalScrollIndicator={false}>
          <Box twClassName="gap-4 px-4 pb-8">
            {history.map((item) => (
              <EarningsHistoryRow key={item.id} item={item} />
            ))}
          </Box>
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default RewardsEarningsHistoryView;
