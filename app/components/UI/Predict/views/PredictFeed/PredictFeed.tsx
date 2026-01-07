import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useState, useEffect, useCallback } from 'react';
import { View } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { PredictMarketListSelectorsIDs } from '../../../../../../tests/selectors/Predict/Predict.selectors';
import { useTheme } from '../../../../../util/theme';
import { TraceName } from '../../../../../util/trace';
import { PredictBalance } from '../../components/PredictBalance';
import PredictFeedHeader from '../../components/PredictFeedHeader';
import PredictMarketList from '../../components/PredictMarketList';
import { useSharedScrollCoordinator } from '../../hooks/useSharedScrollCoordinator';
import { usePredictMeasurement } from '../../hooks/usePredictMeasurement';
import PredictFeedSessionManager from '../../services/PredictFeedSessionManager';
import { PredictNavigationParamList } from '../../types/navigation';
import type { PredictCategory } from '../../types';

const PredictFeed = () => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const route =
    useRoute<RouteProp<PredictNavigationParamList, 'PredictMarketList'>>();
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const scrollCoordinator = useSharedScrollCoordinator();
  const sessionManager = PredictFeedSessionManager.getInstance();

  // Track screen load performance
  usePredictMeasurement({
    traceName: TraceName.PredictFeedView,
    conditions: [!isSearchVisible],
    debugContext: {
      entryPoint: route.params?.entryPoint,
      isSearchVisible,
    },
  });

  // Initialize session and enable AppState listener on mount
  useEffect(() => {
    // Enable AppState listener to detect app backgrounding
    sessionManager.enableAppStateListener();

    // Start session
    sessionManager.startSession(route.params?.entryPoint, 'trending');

    return () => {
      // End session and disable listener on unmount
      sessionManager.endSession();
      sessionManager.disableAppStateListener();
    };
  }, [route.params?.entryPoint, sessionManager]);

  // Track page views when returning from market details
  useFocusEffect(
    useCallback(() => {
      // Note: Return from background is handled by AppState listener
      // This only tracks when user navigates back from market details
      sessionManager.trackPageView();
    }, [sessionManager]),
  );

  const handleBalanceCardLayout = (height: number) => {
    scrollCoordinator.setBalanceCardHeight(height);
  };

  // Handle tab changes - track analytics
  const handleTabChange = useCallback(
    (tab: PredictCategory) => {
      sessionManager.trackTabChange(tab);
    },
    [sessionManager],
  );

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
      <View style={tw.style('flex-1')}>
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
          onTabChange={handleTabChange}
        />
      </View>
    </SafeAreaView>
  );
};

export default PredictFeed;
