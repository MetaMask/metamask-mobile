import {
  type NavigationProp,
  type RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import PredictPositionsViewHeader from '../../components/PredictPositionsViewHeader';
import { usePredictPortfolio } from '../../hooks/usePredictPortfolio';
import { PredictPositionsViewSelectorsIDs } from '../../Predict.testIds';
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
            <Box twClassName="items-center gap-3 py-3">
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
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const route =
    useRoute<RouteProp<PredictNavigationParamList, 'PredictPositions'>>();
  const tw = useTailwind();
  const portfolio = usePredictPortfolio();
  const privacyMode = useSelector(selectPrivacyMode);
  const [activeTab, setActiveTab] = useState<PredictPositionsTabKey>(
    route.params?.initialTab ?? 'positions',
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

  const handleBackPress = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate(Routes.PREDICT.MARKET_LIST);
  }, [navigation]);

  const handleTabPress = useCallback((tab: PredictPositionsTabKey) => {
    setActiveTab(tab);
  }, []);

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
            isPrivacyMode={Boolean(privacyMode)}
            onClaimPress={portfolio.claim}
            portfolio={portfolio}
          />
          <PredictPositionsTabs
            tabs={tabs}
            activeTab={activeTab}
            onTabPress={handleTabPress}
          />
        </Box>

        <Box twClassName="flex-1 px-4">
          {activeTab === 'positions' ? (
            <Box
              twClassName="flex-1"
              testID={PredictPositionsViewSelectorsIDs.POSITIONS_TAB_CONTENT}
            />
          ) : (
            <Box
              twClassName="flex-1"
              testID={PredictPositionsViewSelectorsIDs.HISTORY_TAB_CONTENT}
            />
          )}
        </Box>
      </Box>
    </SafeAreaView>
  );
};

export default PredictPositionsView;
