import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Pressable, ScrollView, View } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  HeaderStandard,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Routes from '../../../../../constants/navigation/Routes';
import {
  selectPredictWorldCupConfig,
  selectPredictWorldCupScreenEnabledFlag,
} from '../../selectors/featureFlags';
import type { PredictNavigationParamList } from '../../types/navigation';
import {
  resolvePredictWorldCupInitialTab,
  type PredictWorldCupTabKey,
} from '../../constants/worldCupTabs';
import { usePredictWorldCupAvailableTabs } from '../../hooks';

export const PREDICT_WORLD_CUP_SCREEN_TEST_IDS = {
  CONTAINER: 'predict-world-cup-screen',
  INITIAL_TAB: 'predict-world-cup-initial-tab',
  TABS: 'predict-world-cup-tabs',
  TAB: 'predict-world-cup-tab',
  EMPTY_STATE: 'predict-world-cup-empty-state',
} as const;

type Tw = ReturnType<typeof useTailwind>;

const LiveIndicator = ({ tw, size = 8 }: { tw: Tw; size?: number }) => (
  <View
    style={[
      tw.style('bg-success-default'),
      {
        width: size,
        height: size,
        borderRadius: size / 2,
      },
    ]}
  />
);

const PredictWorldCup: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<PredictNavigationParamList, 'PredictWorldCup'>>();
  const config = useSelector(selectPredictWorldCupConfig);
  const isScreenEnabled = useSelector(selectPredictWorldCupScreenEnabledFlag);

  const { tabs, availability } = usePredictWorldCupAvailableTabs(config, {
    enabled: isScreenEnabled,
  });

  const initialTab = useMemo(
    () =>
      resolvePredictWorldCupInitialTab(
        route.params?.initialTab,
        config,
        availability,
      ),
    [availability, config, route.params?.initialTab],
  );

  const [activeTab, setActiveTab] = useState<PredictWorldCupTabKey>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (isScreenEnabled) {
      return;
    }

    navigation.navigate(Routes.PREDICT.MARKET_LIST, {
      entryPoint: route.params?.entryPoint,
    });
  }, [isScreenEnabled, navigation, route.params?.entryPoint]);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate(Routes.PREDICT.MARKET_LIST, {
      entryPoint: route.params?.entryPoint,
    });
  }, [navigation, route.params?.entryPoint]);

  if (!isScreenEnabled) {
    return null;
  }

  return (
    <SafeAreaView
      edges={['bottom', 'left', 'right']}
      style={tw.style('flex-1 bg-default')}
      testID={PREDICT_WORLD_CUP_SCREEN_TEST_IDS.CONTAINER}
    >
      <HeaderStandard title="World Cup" onBack={handleBack} includesTopInset />

      <Box twClassName="flex-1">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={tw.style('grow-0')}
          contentContainerStyle={tw.style('gap-2 px-4 pb-4')}
          testID={PREDICT_WORLD_CUP_SCREEN_TEST_IDS.TABS}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;

            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={tw.style(
                  'min-w-[51px] flex-row items-center justify-center gap-2 rounded-xl bg-muted p-2',
                  isActive && 'bg-white',
                )}
                testID={`${PREDICT_WORLD_CUP_SCREEN_TEST_IDS.TAB}-${tab.key}`}
              >
                {tab.isLive && <LiveIndicator tw={tw} />}
                <Text
                  color={
                    isActive
                      ? TextColor.PrimaryInverse
                      : TextColor.TextAlternative
                  }
                  variant={TextVariant.BodySm}
                  style={tw.style(
                    'font-medium leading-[22px]',
                    tab.isLive && !isActive && 'text-success-default',
                  )}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text
          testID={PREDICT_WORLD_CUP_SCREEN_TEST_IDS.INITIAL_TAB}
          style={tw.style('h-0 opacity-0')}
        >
          {activeTab}
        </Text>

        <Box
          twClassName="flex-1"
          testID={PREDICT_WORLD_CUP_SCREEN_TEST_IDS.EMPTY_STATE}
        />
      </Box>
    </SafeAreaView>
  );
};

export default PredictWorldCup;
