import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useState } from 'react';
import { SafeAreaView, View } from 'react-native';
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
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const scrollCoordinator = useSharedScrollCoordinator();

  const handleBalanceCardLayout = (height: number) => {
    scrollCoordinator.setBalanceCardHeight(height);
  };

  const balanceCardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scrollCoordinator.balanceCardOffset.value }],
  }));

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
      style={tw.style('flex-1', {
        backgroundColor: colors.background.default,
      })}
    >
      <View style={tw.style('flex-1 pt-2 px-6')}>
        <PredictFeedHeader
          isSearchVisible={isSearchVisible}
          onSearchToggle={handleSearchToggle}
          onSearchCancel={handleSearchCancel}
          onSearch={handleSearch}
        />
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
