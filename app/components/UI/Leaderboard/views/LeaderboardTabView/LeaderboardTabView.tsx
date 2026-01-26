import React, { useCallback, useState, useEffect } from 'react';
import { RefreshControl, View, ActivityIndicator } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useSelector } from 'react-redux';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import ConditionalScrollView from '../../../../../component-library/components-temp/ConditionalScrollView';
import { selectHomepageRedesignV1Enabled } from '../../../../../selectors/featureFlagController/homepage';
import { useLeaderboard } from '../../hooks/useLeaderboard';
import LeaderboardHeader from '../../components/LeaderboardHeader';
import LeaderboardRow from '../../components/LeaderboardRow';
import LeaderboardEmpty from '../../components/LeaderboardEmpty';
import LeaderboardError from '../../components/LeaderboardError';
import TraderDetailSheet from '../../components/TraderDetailSheet';
import { LeaderboardTestIds } from '../../Leaderboard.testIds';
import { LeaderboardTrader } from '../../types';

interface LeaderboardTabViewProps {
  /** Whether the tab is currently visible */
  isVisible?: boolean;
  /** Callback when visibility changes */
  onVisibilityChange?: (callback: (visible: boolean) => void) => void;
}

/**
 * Main view for the Leaderboard tab
 * Displays top traders from the Clicker leaderboard API
 */
const LeaderboardTabView: React.FC<LeaderboardTabViewProps> = ({
  isVisible = true,
  onVisibilityChange,
}) => {
  const tw = useTailwind();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentVisibility, setCurrentVisibility] = useState(isVisible);
  const [selectedTrader, setSelectedTrader] =
    useState<LeaderboardTrader | null>(null);
  const [isDetailSheetVisible, setIsDetailSheetVisible] = useState(false);

  const isHomepageRedesignV1Enabled = useSelector(
    selectHomepageRedesignV1Enabled,
  );

  // Register visibility callback
  useEffect(() => {
    if (onVisibilityChange) {
      onVisibilityChange(setCurrentVisibility);
    }
  }, [onVisibilityChange]);

  // Update visibility when prop changes
  useEffect(() => {
    setCurrentVisibility(isVisible);
  }, [isVisible]);

  const { traders, isLoading, error, refresh } = useLeaderboard({
    isVisible: currentVisibility,
    limit: 50,
  });

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [refresh]);

  const handleTraderPress = useCallback((trader: LeaderboardTrader) => {
    setSelectedTrader(trader);
    setIsDetailSheetVisible(true);
  }, []);

  const handleCloseDetailSheet = useCallback(() => {
    setIsDetailSheetVisible(false);
    setSelectedTrader(null);
  }, []);

  // Loading state
  if (isLoading && traders.length === 0) {
    return (
      <Box
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="flex-1 py-16"
        testID={LeaderboardTestIds.LOADING_INDICATOR}
      >
        <ActivityIndicator size="large" />
      </Box>
    );
  }

  // Error state
  if (error && traders.length === 0) {
    return <LeaderboardError error={error} onRetry={handleRefresh} />;
  }

  // Empty state
  if (!isLoading && traders.length === 0) {
    return <LeaderboardEmpty />;
  }

  const content = (
    <Box twClassName="px-4" testID={LeaderboardTestIds.CONTAINER}>
      <LeaderboardHeader />
      {traders.map((trader, index) => (
        <LeaderboardRow
          key={trader.id}
          trader={trader}
          rank={index + 1}
          onPress={handleTraderPress}
        />
      ))}
    </Box>
  );

  return (
    <View
      style={tw.style(
        isHomepageRedesignV1Enabled ? 'bg-default' : 'flex-1 bg-default',
      )}
    >
      <ConditionalScrollView
        isScrollEnabled={!isHomepageRedesignV1Enabled}
        scrollViewProps={{
          testID: LeaderboardTestIds.SCROLL_VIEW,
          refreshControl: (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              testID={LeaderboardTestIds.REFRESH_CONTROL}
            />
          ),
        }}
      >
        {content}
      </ConditionalScrollView>

      {/* Trader Detail Bottom Sheet */}
      <TraderDetailSheet
        trader={selectedTrader}
        isVisible={isDetailSheetVisible}
        onClose={handleCloseDetailSheet}
      />
    </View>
  );
};

export default LeaderboardTabView;
