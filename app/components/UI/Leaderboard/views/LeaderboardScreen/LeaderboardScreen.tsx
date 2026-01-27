import React, { useCallback, useState } from 'react';
import { View, RefreshControl, ActivityIndicator } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Text,
  TextVariant,
  BoxFlexDirection,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../../component-library/hooks';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import ConditionalScrollView from '../../../../../component-library/components-temp/ConditionalScrollView';
import { strings } from '../../../../../../locales/i18n';
import { useLeaderboard } from '../../hooks/useLeaderboard';
import LeaderboardHeader from '../../components/LeaderboardHeader';
import LeaderboardRow from '../../components/LeaderboardRow';
import LeaderboardEmpty from '../../components/LeaderboardEmpty';
import LeaderboardError from '../../components/LeaderboardError';
import TraderDetailSheet from '../../components/TraderDetailSheet';
import { LeaderboardTestIds } from '../../Leaderboard.testIds';
import { LeaderboardTrader } from '../../types';
import styleSheet from './LeaderboardScreen.styles';

/**
 * Standalone Leaderboard screen accessible from the Trade menu
 * Displays top traders from the Clicker leaderboard API
 */
const LeaderboardScreen: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const { styles } = useStyles(styleSheet, {});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTrader, setSelectedTrader] =
    useState<LeaderboardTrader | null>(null);
  const [isDetailSheetVisible, setIsDetailSheetVisible] = useState(false);

  const { traders, isLoading, error, refresh } = useLeaderboard({
    isVisible: true,
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

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Loading state
  if (isLoading && traders.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <ButtonIcon
            iconName={IconName.ArrowLeft}
            size={ButtonIconSizes.Lg}
            onPress={handleGoBack}
            testID="leaderboard-back-button"
          />
          <Text variant={TextVariant.HeadingMd} style={styles.title}>
            {strings('leaderboard.title')}
          </Text>
          <View style={styles.placeholder} />
        </View>
        <Box
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="flex-1"
          testID={LeaderboardTestIds.LOADING_INDICATOR}
        >
          <ActivityIndicator size="large" />
        </Box>
      </SafeAreaView>
    );
  }

  // Error state
  if (error && traders.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <ButtonIcon
            iconName={IconName.ArrowLeft}
            size={ButtonIconSizes.Lg}
            onPress={handleGoBack}
            testID="leaderboard-back-button"
          />
          <Text variant={TextVariant.HeadingMd} style={styles.title}>
            {strings('leaderboard.title')}
          </Text>
          <View style={styles.placeholder} />
        </View>
        <LeaderboardError error={error} onRetry={handleRefresh} />
      </SafeAreaView>
    );
  }

  // Empty state
  if (!isLoading && traders.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <ButtonIcon
            iconName={IconName.ArrowLeft}
            size={ButtonIconSizes.Lg}
            onPress={handleGoBack}
            testID="leaderboard-back-button"
          />
          <Text variant={TextVariant.HeadingMd} style={styles.title}>
            {strings('leaderboard.title')}
          </Text>
          <View style={styles.placeholder} />
        </View>
        <LeaderboardEmpty />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with back button */}
      <View style={styles.header}>
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          size={ButtonIconSizes.Lg}
          onPress={handleGoBack}
          testID="leaderboard-back-button"
        />
        <Text variant={TextVariant.HeadingMd} style={styles.title}>
          {strings('leaderboard.title')}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <ConditionalScrollView
        isScrollEnabled
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
      </ConditionalScrollView>

      {/* Trader Detail Sheet */}
      <TraderDetailSheet
        trader={selectedTrader}
        isVisible={isDetailSheetVisible}
        onClose={handleCloseDetailSheet}
      />
    </SafeAreaView>
  );
};

export default LeaderboardScreen;
