import React, { useCallback, useEffect, useState } from 'react';
import {
  type RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Box, HeaderStandard } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import { useBalance } from '../../hooks/useBalance';
import { PredictNextRoutes } from '../../navigation/routes';
import type {
  PredictNextStackParamList,
  PredictPortfolioTab,
} from '../../navigation/types';
import { PortfolioEmptyState } from './internal/PortfolioEmptyState';
import { PortfolioSummaryCard } from './internal/PortfolioSummaryCard';
import { PortfolioTabs } from './internal/PortfolioTabs';
import { PredictPortfolioScreenTestIds } from './PredictPortfolioScreen.testIds';

export const PredictPortfolioScreen = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<PredictNextStackParamList>>();
  const route =
    useRoute<RouteProp<PredictNextStackParamList, 'PredictNextPortfolio'>>();
  const tw = useTailwind();
  const privacyMode = useSelector(selectPrivacyMode);
  const balanceQuery = useBalance(route.params.venueId);
  const [activeTab, setActiveTab] = useState<PredictPortfolioTab>(
    route.params.initialTab ?? 'positions',
  );

  useEffect(() => {
    setActiveTab(route.params.initialTab ?? 'positions');
  }, [route.params.initialTab]);

  const browseMarkets = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.popToTop();
      return;
    }
    navigation.navigate(PredictNextRoutes.HOME);
  }, [navigation]);

  const positionsActive = activeTab === 'positions';
  const historyActive = activeTab === 'history';

  return (
    <SafeAreaView
      edges={['left', 'right', 'bottom']}
      style={tw.style('flex-1 bg-default')}
      testID={PredictPortfolioScreenTestIds.CONTAINER}
    >
      <Box testID={PredictPortfolioScreenTestIds.HEADER}>
        <HeaderStandard
          includesTopInset
          title={strings('predict_next.portfolio.title')}
          onBack={() => navigation.goBack()}
          backButtonProps={{ testID: PredictPortfolioScreenTestIds.BACK }}
        />
      </Box>
      <Box twClassName="flex-1 px-4">
        <PortfolioSummaryCard
          balance={balanceQuery.data}
          isLoading={balanceQuery.isPending}
          isPrivacyMode={Boolean(privacyMode)}
          onRetry={() => balanceQuery.refetch()}
        />
        <PortfolioTabs activeTab={activeTab} onTabPress={setActiveTab} />
        <Box twClassName="flex-1">
          <Box
            accessibilityElementsHidden={!positionsActive}
            importantForAccessibility={
              positionsActive ? 'auto' : 'no-hide-descendants'
            }
            pointerEvents={positionsActive ? 'auto' : 'none'}
            style={tw.style('flex-1', !positionsActive && 'hidden')}
            testID={PredictPortfolioScreenTestIds.POSITIONS_CONTENT}
          >
            <PortfolioEmptyState onBrowseMarkets={browseMarkets} />
          </Box>
          <Box
            accessibilityElementsHidden={!historyActive}
            importantForAccessibility={
              historyActive ? 'auto' : 'no-hide-descendants'
            }
            pointerEvents={historyActive ? 'auto' : 'none'}
            style={tw.style('flex-1', !historyActive && 'hidden')}
            testID={PredictPortfolioScreenTestIds.HISTORY_CONTENT}
          >
            <PortfolioEmptyState onBrowseMarkets={browseMarkets} />
          </Box>
        </Box>
      </Box>
    </SafeAreaView>
  );
};
