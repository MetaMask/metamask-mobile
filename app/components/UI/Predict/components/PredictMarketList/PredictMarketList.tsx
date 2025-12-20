import { useTailwind } from '@metamask/design-system-twrnc-preset';
import ScrollableTabView from '@tommasini/react-native-scrollable-tab-view';
import React, { useCallback } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { PredictMarketListSelectorsIDs } from '../../../../../../e2e/selectors/Predict/Predict.selectors';
import { strings } from '../../../../../../locales/i18n';
import TabBar from '../../../../Base/TabBar';
import { useTheme } from '../../../../../util/theme';
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
  const { colors } = useTheme();

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
    'worklet';
    if (!scrollCoordinator) {
      return {};
    }
    const offset = scrollCoordinator.balanceCardOffset.value;
    // Transform AND marginBottom to fill space when card is hidden
    // With direction-aware logic, marginBottom won't cause flicker anymore
    return {
      transform: [{ translateY: offset }],
      marginBottom: offset,
    };
  }, [scrollCoordinator?.balanceCardOffset]);

  return (
    <>
      {isSearchVisible && searchQuery.length > 0 && (
        <ScrollableTabView
          renderTabBar={false}
          style={tw.style('flex-1 w-full')}
          initialPage={0}
        >
          <View key="search" style={tw.style('flex-1 w-full')}>
            <MarketListContent
              category="trending"
              q={searchQuery}
              entryPoint={PredictEventValues.ENTRY_POINT.SEARCH}
            />
          </View>
        </ScrollableTabView>
      )}

      {!isSearchVisible && (
        <Animated.View style={[tw.style('flex-1 w-full'), tabsAnimatedStyle]}>
          <ScrollableTabView
            renderTabBar={() => (
              <TabBar
                activeTextColor={colors.text.default}
                underlineStyle={tw.style('h-[2px] bg-text-default')}
                underlineHeight={2}
              />
            )}
            style={tw.style('flex-1 w-full')}
            initialPage={0}
            onChangeTab={handleTabChange}
          >
            <View
              key="trending"
              {...{ tabLabel: strings('predict.category.trending') }}
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
              {...{ tabLabel: strings('predict.category.new') }}
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
              {...{ tabLabel: strings('predict.category.sports') }}
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
              {...{ tabLabel: strings('predict.category.crypto') }}
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
              {...{ tabLabel: strings('predict.category.politics') }}
              style={tw.style('flex-1 w-full')}
              testID={PredictMarketListSelectorsIDs.POLITICS_TAB}
            >
              <MarketListContent
                category="politics"
                scrollCoordinator={scrollCoordinator}
              />
            </View>
          </ScrollableTabView>
        </Animated.View>
      )}
    </>
  );
};

export default PredictMarketList;
