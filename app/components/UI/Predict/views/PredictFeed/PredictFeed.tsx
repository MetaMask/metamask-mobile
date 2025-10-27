import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useState } from 'react';
import { View } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { PredictMarketListSelectorsIDs } from '../../../../../../e2e/selectors/Predict/Predict.selectors';
import { useTheme } from '../../../../../util/theme';
import { PredictBalance } from '../../components/PredictBalance';
import PredictFeedHeader from '../../components/PredictFeedHeader';
import PredictMarketList from '../../components/PredictMarketList';
import { useSharedScrollCoordinator } from '../../hooks/useSharedScrollCoordinator';

const PredictFeed = () => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const scrollCoordinator = useSharedScrollCoordinator();

  const handleBalanceCardLayout = (height: number) => {
    scrollCoordinator.setBalanceCardHeight(height);
  };

  const balanceCardAnimatedStyle = useAnimatedStyle(() => {
    const offset = scrollCoordinator.balanceCardOffset.value;
    const height = scrollCoordinator.balanceCardHeight.value;
    const opacity = height > 0 ? Math.max(0, 1 + offset / height) : 1;

    return {
      transform: [{ translateY: offset }],
      opacity,
    };
  });

  const handleSearchToggle = () => {
    setIsSearchVisible(true);
  };

  const handleSearchCancel = () => {
    setIsSearchVisible(false);
    setSearchQuery('');
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  return (
    <SafeAreaView
      testID={PredictMarketListSelectorsIDs.CONTAINER}
      style={tw.style('flex-1', { backgroundColor: colors.background.default })}
      edges={['left', 'right']}
    >
      <View style={tw.style('flex-1 px-6')}>
        <View
          style={[
            tw.style('z-10'),
            {
              backgroundColor: colors.background.default,
              paddingTop: insets.top + 8,
            },
          ]}
        >
          <PredictFeedHeader
            isSearchVisible={isSearchVisible}
            onSearchToggle={handleSearchToggle}
            onSearchCancel={handleSearchCancel}
            onSearch={handleSearch}
          />
        </View>
        {!isSearchVisible && (
          <Animated.View style={balanceCardAnimatedStyle}>
            <PredictBalance onLayout={handleBalanceCardLayout} />
          </Animated.View>
        )}
        <PredictMarketList
          isSearchVisible={isSearchVisible}
          searchQuery={searchQuery}
          scrollCoordinator={scrollCoordinator}
        />
      </View>
    </SafeAreaView>
  );
};

export default PredictFeed;
