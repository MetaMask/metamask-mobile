import {
  type RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable } from 'react-native';
import { useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  FontWeight,
  HeaderStandard,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import { PredictEventValues } from '../../constants/eventNames';
import PredictPositionsHistoryList from '../../components/PredictPositionsHistoryList';
import PredictPositionsList from '../../components/PredictPositionsList';
import PredictPositionsViewHeader from '../../components/PredictPositionsViewHeader';
import { usePredictPortfolio } from '../../hooks/usePredictPortfolio';
import { PredictPositionsViewSelectorsIDs } from '../../Predict.testIds';
import { selectPredictPortfolioEnabledFlag } from '../../selectors/featureFlags';
import type {
  PredictNavigationParamList,
  PredictPositionsTabKey,
} from '../../types/navigation';

interface PredictPositionsTabItem {
  key: PredictPositionsTabKey;
  label: string;
  testID: string;
}

interface PredictPositionsTabsProps {
  activeTab: PredictPositionsTabKey;
  onTabPress: (tab: PredictPositionsTabKey) => void;
  tabs: PredictPositionsTabItem[];
}

const PredictPositionsTabs = ({
  activeTab,
  onTabPress,
  tabs,
}: PredictPositionsTabsProps) => {
  const tw = useTailwind();

  return (
    <Box twClassName="flex-row" testID={PredictPositionsViewSelectorsIDs.TABS}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;

        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            onPress={() => onTabPress(tab.key)}
            style={tw.style('flex-1')}
            testID={tab.testID}
          >
            <Box twClassName="items-center gap-3">
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={isActive ? FontWeight.Bold : FontWeight.Regular}
                twClassName={isActive ? 'text-default' : 'text-alternative'}
              >
                {tab.label}
              </Text>
              <Box
                twClassName={`h-0.5 w-full ${
                  isActive ? 'bg-icon-default' : 'bg-transparent'
                }`}
              />
            </Box>
          </Pressable>
        );
      })}
    </Box>
  );
};

const PredictPositionsView = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const route =
    useRoute<RouteProp<PredictNavigationParamList, 'PredictPositions'>>();
  const tw = useTailwind();
  const portfolio = usePredictPortfolio();
  const privacyMode = useSelector(selectPrivacyMode);
  const predictPortfolioEnabled = useSelector(
    selectPredictPortfolioEnabledFlag,
  );
  const hasTrackedScreenViewedRef = useRef(false);
  const hasTrackedHistoryTabViewedRef = useRef(false);
  const [activeTab, setActiveTab] = useState<PredictPositionsTabKey>(
    route.params?.initialTab ?? 'positions',
  );
  const entryPoint =
    route.params?.entryPoint ??
    PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS;

  const analyticsProperties = useMemo(
    () => ({
      entryPoint,
      openPositionsCount: portfolio.openPositionCount,
      claimablePositionsCount: portfolio.claimablePositionCount,
      hasClaimableWinnings: portfolio.hasClaimableWinnings,
      predictScreen: PredictEventValues.PREDICT_SCREEN.PREDICT_POSITIONS_SCREEN,
    }),
    [
      entryPoint,
      portfolio.claimablePositionCount,
      portfolio.hasClaimableWinnings,
      portfolio.openPositionCount,
    ],
  );

  const tabs = useMemo<PredictPositionsTabItem[]>(
    () => [
      {
        key: 'positions',
        label: strings('predict.tabs.active_positions'),
        testID: PredictPositionsViewSelectorsIDs.POSITIONS_TAB,
      },
      {
        key: 'history',
        label: strings('predict.tabs.history'),
        testID: PredictPositionsViewSelectorsIDs.HISTORY_TAB,
      },
    ],
    [],
  );

  useEffect(() => {
    setActiveTab(route.params?.initialTab ?? 'positions');
  }, [route.params?.initialTab]);

  useEffect(() => {
    if (portfolio.isLoading || hasTrackedScreenViewedRef.current) {
      return;
    }

    Engine.context.PredictController.trackPositionsScreenViewed(
      analyticsProperties,
    );

    if (activeTab === 'history' && !hasTrackedHistoryTabViewedRef.current) {
      Engine.context.PredictController.trackPositionsTabViewed({
        ...analyticsProperties,
        predictFeedTab: PredictEventValues.PREDICT_FEED_TAB.HISTORY,
      });
      hasTrackedHistoryTabViewedRef.current = true;
    }

    hasTrackedScreenViewedRef.current = true;
  }, [activeTab, analyticsProperties, portfolio.isLoading]);

  const trackTabViewed = useCallback(
    (tab: PredictPositionsTabKey) => {
      Engine.context.PredictController.trackPositionsTabViewed({
        ...analyticsProperties,
        predictFeedTab: tab,
      });

      if (tab === 'history') {
        hasTrackedHistoryTabViewedRef.current = true;
      }
    },
    [analyticsProperties],
  );

  const handleBackPress = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate(Routes.PREDICT.MARKET_LIST);
  }, [navigation]);

  const handleTabPress = useCallback(
    (tab: PredictPositionsTabKey) => {
      trackTabViewed(tab);

      if (tab === activeTab) {
        return;
      }

      setActiveTab(tab);
    },
    [activeTab, trackTabViewed],
  );

  const isPositionsTabActive = activeTab === 'positions';
  const isHistoryTabActive = activeTab === 'history';

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default')}
      edges={['left', 'right', 'bottom']}
      testID={PredictPositionsViewSelectorsIDs.CONTAINER}
    >
      <Box twClassName="flex-1">
        <Box testID={PredictPositionsViewSelectorsIDs.HEADER}>
          <HeaderStandard
            title={strings('predict.tabs.positions')}
            onBack={handleBackPress}
            backButtonProps={{
              testID: PredictPositionsViewSelectorsIDs.BACK_BUTTON,
            }}
            includesTopInset
          />
        </Box>

        <Box twClassName="px-4">
          <PredictPositionsViewHeader
            entryPoint={entryPoint}
            isPrivacyMode={Boolean(privacyMode)}
            portfolio={portfolio}
          />
          <PredictPositionsTabs
            tabs={tabs}
            activeTab={activeTab}
            onTabPress={handleTabPress}
          />
        </Box>

        <Box twClassName="flex-1 px-4">
          <Box
            accessibilityElementsHidden={!isPositionsTabActive}
            importantForAccessibility={
              isPositionsTabActive ? 'auto' : 'no-hide-descendants'
            }
            pointerEvents={isPositionsTabActive ? 'auto' : 'none'}
            style={tw.style('flex-1', !isPositionsTabActive && 'hidden')}
            testID={PredictPositionsViewSelectorsIDs.POSITIONS_TAB_CONTENT}
          >
            <PredictPositionsList
              isPrivacyMode={Boolean(privacyMode)}
              portfolio={portfolio}
            />
          </Box>
          <Box
            accessibilityElementsHidden={!isHistoryTabActive}
            importantForAccessibility={
              isHistoryTabActive ? 'auto' : 'no-hide-descendants'
            }
            pointerEvents={isHistoryTabActive ? 'auto' : 'none'}
            style={tw.style('flex-1', !isHistoryTabActive && 'hidden')}
            testID={PredictPositionsViewSelectorsIDs.HISTORY_TAB_CONTENT}
          >
            <PredictPositionsHistoryList
              claimPendingPositions={
                predictPortfolioEnabled
                  ? portfolio.actionableClaimablePositions
                  : undefined
              }
              onClaimPendingPositionsRefresh={
                predictPortfolioEnabled ? portfolio.refetch : undefined
              }
              isPrivacyMode={Boolean(privacyMode)}
              isVisible={isHistoryTabActive}
            />
          </Box>
        </Box>
      </Box>
    </SafeAreaView>
  );
};

export default PredictPositionsView;
