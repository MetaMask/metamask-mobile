import React, { useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import dayjs from 'dayjs';
import LocalizedFormat from 'dayjs/plugin/localizedFormat';
import { useTheme } from '../../../../util/theme';
import type { Colors } from '../../../../util/theme/models';
import { useRewardsPointsEvents } from '../../../../core/Engine/controllers/rewards-controller/hooks/useRewardsPointsEvents';
import { PointsEventDto } from '../../../../core/Engine/controllers/rewards-controller/types';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../component-library/components/Icons/Icon';
import ListItem from '../../../Base/ListItem';

// Extend dayjs with LocalizedFormat plugin
dayjs.extend(LocalizedFormat);

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    scrollContainer: {},
    section: {
      marginTop: 12,
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text.default,
      marginBottom: 12,
    },
    loadingContainer: {
      paddingVertical: 20,
      alignItems: 'center',
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.background.muted,
      justifyContent: 'center',
      alignItems: 'center',
    },
    earnedText: {
      fontSize: 14,
      color: colors.text.alternative,
    },
    confirmedText: {
      fontSize: 14,
      color: colors.success.default,
    },
    emptyState: {
      backgroundColor: colors.background.muted,
      padding: 24,
      borderRadius: 12,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 16,
      color: colors.text.alternative,
      textAlign: 'center',
    },
  });

// Helper function to format timestamp to readable date
const formatEventDate = (timestamp: string): string =>
  dayjs(timestamp).format('LLL');

// Helper function to get icon based on event type
const getEventIcon = (type: string): IconName => {
  switch (type.toLowerCase()) {
    case 'swap':
      return IconName.SwapHorizontal;
    case 'bridge':
      return IconName.Bridge;
    case 'reward':
    default:
      return IconName.Star;
  }
};

// Helper function to get event title
const getEventTitle = (type: string): string => {
  switch (type.toLowerCase()) {
    case 'swap':
      return 'Swap';
    case 'bridge':
      return 'Bridge';
    case 'reward':
      return 'Reward';
    default:
      return 'Points Event';
  }
};

interface HistoryTabProps {
  tabLabel?: string;
}

const HistoryTab: React.FC<HistoryTabProps> = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useRewardsPointsEvents();

  // Memoize the point events to prevent unnecessary recalculations on re-renders
  // const pointEvents = useMemo(() => mockEvents, []);
  const pointEvents = useMemo(() => (
      data?.pages.reduce<PointsEventDto[]>((acc, page) => [...acc, ...page.results], []) ?? []
    ), [data?.pages]);

  // Handle loading more data when user scrolls to the end
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Render loading indicator at the bottom
  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary.default} />
      </View>
    );
  }, [isFetchingNextPage, styles.loadingContainer, colors.primary.default]);

  // Render individual history item
  const renderHistoryItem = useCallback(
    ({ item }: { item: PointsEventDto }) => (
      <ListItem key={item.id}>
        <ListItem.Date>{formatEventDate(item.timestamp)}</ListItem.Date>
        <ListItem.Content>
          <ListItem.Icon>
            <View style={styles.iconContainer}>
              <Icon
                name={getEventIcon(item.type)}
                size={IconSize.Md}
                color={IconColor.Primary}
              />
            </View>
          </ListItem.Icon>
          <ListItem.Body>
            <ListItem.Title>{getEventTitle(item.type)}</ListItem.Title>
            <Text style={styles.confirmedText}>Confirmed</Text>
          </ListItem.Body>
          {item.value && (
            <ListItem.Amounts>
              <ListItem.Amount>{item.value} points</ListItem.Amount>
              <Text style={styles.earnedText}>Earned</Text>
            </ListItem.Amounts>
          )}
        </ListItem.Content>
      </ListItem>
    ),
    [styles],
  );

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        {pointEvents.length > 0 ? (
          <FlatList
            data={pointEvents}
            renderItem={renderHistoryItem}
            keyExtractor={(item) => item.id}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.1}
            ListFooterComponent={renderFooter}
            contentContainerStyle={styles.scrollContainer}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No reward history available yet
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default HistoryTab;
