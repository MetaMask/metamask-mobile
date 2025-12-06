import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useCallback } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { PredictMarketListSelectorsIDs } from '../../../../../../e2e/selectors/Predict/Predict.selectors';
import { strings } from '../../../../../../locales/i18n';
import {
  TabsList,
  TabViewProps,
} from '../../../../../component-library/components-temp/Tabs';
import { PredictEventValues } from '../../constants/eventNames';
import MarketListContent from '../MarketListContent';
import { PredictCategory } from '../../types';
import { ScrollCoordinator } from '../../types/scrollCoordinator';

interface PredictMarketListProps {
  isSearchVisible: boolean;
  searchQuery: string;
  scrollCoordinator?: ScrollCoordinator;
  onTabChange?: (tab: PredictCategory) => void;
}

const PredictMarketList: React.FC<PredictMarketListProps> = ({
  isSearchVisible,
  searchQuery,
  scrollCoordinator,
  onTabChange,
}) => {
  const tw = useTailwind();

  const handleTabChange = useCallback(
    (changeInfo: { i: number; ref: unknown; from?: number }) => {
      const categories: PredictCategory[] = [
        'trending',
        'new',
        'sports',
        'crypto',
        'politics',
      ];
      const category = categories[changeInfo.i];
      if (category) {
        // Update scroll coordinator
        if (scrollCoordinator) {
          scrollCoordinator.setCurrentCategory(category);
        }
        // Notify parent for analytics
        onTabChange?.(category);
      }
    },
    [scrollCoordinator, onTabChange],
  );

  const tabsAnimatedStyle = useAnimatedStyle(() => {
    if (!scrollCoordinator) {
      return {};
    }
    const offset = scrollCoordinator.balanceCardOffset.value;
    return {
      transform: [{ translateY: offset }],
      marginBottom: offset,
    };
  }, [scrollCoordinator]);

  return (
    <>
      {isSearchVisible && searchQuery.length > 0 && (
        <View style={tw.style('flex-1 w-full')}>
          <MarketListContent
            category="trending"
            q={searchQuery}
            entryPoint={PredictEventValues.ENTRY_POINT.SEARCH}
          />
        </View>
      )}

      {!isSearchVisible && (
        <Animated.View style={[tw.style('flex-1 w-full'), tabsAnimatedStyle]}>
          <TabsList
            onChangeTab={handleTabChange}
            initialActiveIndex={0}
            twClassName="flex-1"
            tabsListContentTwClassName="px-0"
          >
            <View
              key="trending"
              {...({
                tabLabel: strings('predict.category.trending'),
              } as TabViewProps)}
              style={tw.style('flex-1 w-full')}
              testID={PredictMarketListSelectorsIDs.TRENDING_TAB}
            >
              <MarketListContent
                category="trending"
                scrollCoordinator={scrollCoordinator}
              />
            </View>

            <View
              key="new"
              {...({
                tabLabel: strings('predict.category.new'),
              } as TabViewProps)}
              style={tw.style('flex-1 w-full')}
              testID={PredictMarketListSelectorsIDs.NEW_TAB}
            >
              <MarketListContent
                category="new"
                scrollCoordinator={scrollCoordinator}
              />
            </View>

            <View
              key="sports"
              {...({
                tabLabel: strings('predict.category.sports'),
              } as TabViewProps)}
              style={tw.style('flex-1 w-full')}
              testID={PredictMarketListSelectorsIDs.SPORTS_TAB}
            >
              <MarketListContent
                category="sports"
                scrollCoordinator={scrollCoordinator}
              />
            </View>

            <View
              key="crypto"
              {...({
                tabLabel: strings('predict.category.crypto'),
              } as TabViewProps)}
              style={tw.style('flex-1 w-full')}
              testID={PredictMarketListSelectorsIDs.CRYPTO_TAB}
            >
              <MarketListContent
                category="crypto"
                scrollCoordinator={scrollCoordinator}
              />
            </View>

            <View
              key="politics"
              {...({
                tabLabel: strings('predict.category.politics'),
              } as TabViewProps)}
              style={tw.style('flex-1 w-full')}
              testID={PredictMarketListSelectorsIDs.POLITICS_TAB}
            >
              <MarketListContent
                category="politics"
                scrollCoordinator={scrollCoordinator}
              />
            </View>
          </TabsList>
        </Animated.View>
      )}
    </>
  );
};

export default PredictMarketList;
