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
import type { PredictEntityId } from '../../types';
import type {
  PredictNextStackParamList,
  PredictPortfolioTab,
} from '../../navigation/types';
import { PortfolioActivityPanel } from './internal/PortfolioActivityPanel';
import { PortfolioPositionsPanel } from './internal/PortfolioPositionsPanel';
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
  const venueId = route.params.venueId;
  const balanceQuery = useBalance(venueId);
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

  const openEvent = useCallback(
    (eventId: PredictEntityId, titleSnapshot: string) => {
      navigation.navigate(PredictNextRoutes.EVENT, {
        venueId,
        eventId,
        titleSnapshot,
      });
    },
    [navigation, venueId],
  );

  const positionsActive = activeTab === 'positions';
  const activityActive = activeTab === 'activity';

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
            <PortfolioPositionsPanel
              venueId={venueId}
              isPrivacyMode={Boolean(privacyMode)}
              onOpenEvent={openEvent}
              onBrowseMarkets={browseMarkets}
            />
          </Box>
          <Box
            accessibilityElementsHidden={!activityActive}
            importantForAccessibility={
              activityActive ? 'auto' : 'no-hide-descendants'
            }
            pointerEvents={activityActive ? 'auto' : 'none'}
            style={tw.style('flex-1', !activityActive && 'hidden')}
            testID={PredictPortfolioScreenTestIds.ACTIVITY_CONTENT}
          >
            <PortfolioActivityPanel
              venueId={venueId}
              isPrivacyMode={Boolean(privacyMode)}
              onOpenEvent={openEvent}
              onBrowseMarkets={browseMarkets}
            />
          </Box>
        </Box>
      </Box>
    </SafeAreaView>
  );
};
