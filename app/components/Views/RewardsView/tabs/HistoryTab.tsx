import React, { useMemo, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator } from 'react-native';
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
    scrollContainer: {

    },
    section: {
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
      backgroundColor: colors.background.alternative,
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

// Mock data for demonstration purposes
const mockEvents: PointsEventDto[] = [
  {
    id: '1',
    timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    type: 'swap',
    value: 50,
    payload: {
      chainId: 1,
      txHash: '0x1234567890abcdef1234567890abcdef12345678',
      fromToken: {
        amount: '100',
        symbol: 'ETH',
      },
      toToken: {
        amount: '2500',
        symbol: 'USDC',
      },
    },
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    type: 'bridge',
    value: 75,
    payload: {
      chainId: 1,
      destChainId: 137,
      txHash: '0xabcdef1234567890abcdef1234567890abcdef12',
      fromToken: {
        amount: '1000',
        symbol: 'USDC',
      },
      toToken: {
        amount: '1000',
        symbol: 'USDC',
      },
    },
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
    type: 'reward',
    value: 100,
  },
  {
    id: '4',
    timestamp: new Date(Date.now() - 345600000).toISOString(), // 4 days ago
    type: 'swap',
    value: 25,
    payload: {
      chainId: 1,
      txHash: '0x9876543210fedcba9876543210fedcba98765432',
      fromToken: {
        amount: '50',
        symbol: 'ETH',
      },
      toToken: {
        amount: '1250',
        symbol: 'USDC',
      },
    },
  },
  {
    id: '5',
    timestamp: new Date(Date.now() - 432000000).toISOString(), // 5 days ago
    type: 'bridge',
    value: 60,
    payload: {
      chainId: 137,
      destChainId: 1,
      txHash: '0xfedcba9876543210fedcba9876543210fedcba98',
      fromToken: {
        amount: '500',
        symbol: 'MATIC',
      },
      toToken: {
        amount: '500',
        symbol: 'ETH',
      },
    },
  },
  {
    id: '6',
    timestamp: new Date(Date.now() - 518400000).toISOString(), // 6 days ago
    type: 'reward',
    value: 150,
  },
  {
    id: '7',
    timestamp: new Date(Date.now() - 604800000).toISOString(), // 7 days ago
    type: 'swap',
    value: 30,
    payload: {
      chainId: 1,
      txHash: '0x1111222233334444555566667777888899990000',
      fromToken: {
        amount: '25',
        symbol: 'ETH',
      },
      toToken: {
        amount: '625',
        symbol: 'USDC',
      },
    },
  },
  {
    id: '8',
    timestamp: new Date(Date.now() - 691200000).toISOString(), // 8 days ago
    type: 'bridge',
    value: 80,
    payload: {
      chainId: 1,
      destChainId: 42161,
      txHash: '0xaaabbbcccdddeeefffaaabbbcccdddeeefffaaab',
      fromToken: {
        amount: '200',
        symbol: 'USDC',
      },
      toToken: {
        amount: '200',
        symbol: 'USDC',
      },
    },
  },
];

const HistoryTab = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { fetchNextPage, hasNextPage, isFetchingNextPage } =
    useRewardsPointsEvents();

  // Memoize the point events to prevent unnecessary recalculations on re-renders
  const pointEvents = useMemo(() => mockEvents, []);

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
  )

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
