import React, { useState, useEffect } from 'react';
import { View, FlatList } from 'react-native';
import { useSelector } from 'react-redux';
import { useStyles } from '../../../component-library/hooks';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import { Skeleton } from '../../../component-library/components/Skeleton';
import ScreenView from '../../Base/ScreenView';
import Logger from '../../../util/Logger';
import PerpsPositionListItem from './PerpsPositionListItem';
import PerpsPositionsHeader from './PerpsPositionsHeader';
import { Theme } from '../../../util/theme/models';
import { selectSelectedInternalAccountFormattedAddress } from '../../../selectors/accountsController';

// Import Hyperliquid SDK components
import { HttpTransport, InfoClient } from '@deeeed/hyperliquid-node20';

// Mock data structure for positions
interface PositionData {
  id: string;
  assetSymbol: string;
  tokenPair: string;
  leverage: string;
  currentPrice: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  positionSize: number;
  entryPrice: number;
  liquidationPrice: number;
  funding: number;
  margin: number;
  takeProfitStopLoss: number;
}

interface PerpsPositionsViewProps {}

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return {
    content: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: 32,
    },
    headerContainer: {
      alignItems: 'center' as const,
      marginBottom: 32,
    },
    headerBalance: {
      alignItems: 'center' as const,
      marginBottom: 16,
    },
    headerChart: {
      alignItems: 'center' as const,
    },
    skeletonRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
    },

    positionsSection: {
      flex: 1,
    },
    sectionTitle: {
      marginBottom: 16,
      paddingHorizontal: 4,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      paddingVertical: 40,
    },
    emptyStateText: {
      marginBottom: 16,
    },
    buttonContainer: {
      marginBottom: 32,
    },
    button: {
      marginBottom: 16,
    },
    positionItem: {
      marginBottom: 12,
      padding: 16,
      backgroundColor: colors.background.default,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border.muted,
    },
  };
};

// Mock position data removed - now using real API data with skeleton loaders

const PerpsPositionsView: React.FC<PerpsPositionsViewProps> = () => {
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const { styles } = useStyles(styleSheet, {});
  const [isLoading, setIsLoading] = useState(true); // Start with loading state
  const [positions, setPositions] = useState<PositionData[]>([]); // Start with empty array
  const [accountValue, setAccountValue] = useState<number>(0);
  const [hasInitialLoad, setHasInitialLoad] = useState(false); // Track if we've loaded data at least once

  // Use the selected address from Redux state, fallback to env variable for testing
  const userAddress = selectedAddress;

  // Calculate total portfolio value and 24h change
  const totalPortfolioValue =
    accountValue ||
    positions.reduce((total, position) => total + position.positionSize, 0);
  const total24hChange = positions.reduce(
    (total, position) => total + position.priceChange24h,
    0,
  );
  const total24hChangePercent =
    totalPortfolioValue > 0 ? (total24hChange / totalPortfolioValue) * 100 : 0;

  const fetchUserPositions = async (address: string) => {
    setIsLoading(true);
    try {
      Logger.log('PerpsPositions: Fetching user positions for', address);
      const transport = new HttpTransport();
      const infoClient = new InfoClient({ transport });

      // Fetch user's clearinghouse state (positions)
      const userState = await infoClient.clearinghouseState({
        user: address as `0x${string}`,
      });

      if (userState?.assetPositions) {
        Logger.log('PerpsPositions: Received position data', {
          positionCount: userState.assetPositions.length,
          accountValue: userState.marginSummary?.accountValue,
        });

        // Update account value from API
        if (userState.marginSummary?.accountValue) {
          setAccountValue(parseFloat(userState.marginSummary.accountValue));
        }

        // Transform API data to our PositionData format
        const transformedPositions: PositionData[] =
          userState.assetPositions.map((pos: any, index: number) => {
            const { position } = pos;
            const currentPrice =
              parseFloat(position.entryPx) *
              (1 +
                (parseFloat(position.unrealizedPnl) /
                  parseFloat(position.positionValue) || 0));

            return {
              id: `${position.coin}-${index}`,
              assetSymbol: position.coin,
              tokenPair: `${position.coin}-USDC`,
              leverage: `${position.leverage?.value || 1}x`,
              currentPrice,
              priceChange24h: parseFloat(position.unrealizedPnl) || 0,
              priceChangePercent24h:
                (parseFloat(position.unrealizedPnl) /
                  parseFloat(position.positionValue)) *
                  100 || 0,
              positionSize: parseFloat(position.positionValue),
              entryPrice: parseFloat(position.entryPx),
              liquidationPrice: parseFloat(position.liquidationPx || '0'),
              funding: parseFloat(position.cumFunding?.allTime || '0'),
              margin: parseFloat(position.marginUsed),
              takeProfitStopLoss: 0, // Not available in API response
            };
          });

        setPositions(transformedPositions);
        Logger.log('PerpsPositions: Transformed positions', {
          count: transformedPositions.length,
        });
      } else {
        Logger.log('PerpsPositions: No positions found for user');
        setPositions([]);
        setAccountValue(0);
      }
    } catch (error) {
      Logger.log('PerpsPositions: Error fetching positions', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      Logger.log('PerpsPositions: Failed to load positions:', errorMessage);
      // On error, show empty state rather than mock data
      setPositions([]);
      setAccountValue(0);
    } finally {
      setIsLoading(false);
      setHasInitialLoad(true);
    }
  };

  // Fetch positions on component mount
  useEffect(() => {
    if (userAddress) {
      fetchUserPositions(userAddress);
    }
  }, [userAddress]);

  const handleRefresh = async () => {
    if (userAddress) {
      await fetchUserPositions(userAddress);
    }
  };

  const renderPositionItem = ({ item }: { item: PositionData }) => (
    <PerpsPositionListItem position={item} />
  );

  const renderSkeletonHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.headerBalance}>
        <Skeleton height={32} width={200} style={{ marginBottom: 8 }} />
        <Skeleton height={16} width={120} />
      </View>
      <View style={styles.headerChart}>
        <Skeleton height={60} width={100} />
      </View>
    </View>
  );

  const renderSkeletonPositions = () => (
    <View>
      {[1, 2, 3].map((index) => (
        <View key={index} style={styles.positionItem}>
          <View style={styles.skeletonRow}>
            <Skeleton height={20} width={60} />
            <Skeleton height={20} width={80} />
          </View>
          <View style={[styles.skeletonRow, { marginTop: 12 }]}>
            <Skeleton height={16} width={100} />
            <Skeleton height={16} width={70} />
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <ScreenView>
      <View style={styles.content}>
        <View style={styles.headerContainer}>
          <Text variant={TextVariant.HeadingLG} color={TextColor.Default}>
            Perps Positions
          </Text>
          <Text variant={TextVariant.BodyMD} color={TextColor.Muted}>
            Monitor your trading positions
          </Text>
        </View>

        {/* Header Section */}
        {isLoading && !hasInitialLoad ? (
          renderSkeletonHeader()
        ) : (
          <PerpsPositionsHeader
            totalPortfolioValue={totalPortfolioValue}
            total24hChange={total24hChange}
            total24hChangePercent={total24hChangePercent}
          />
        )}

        {/* Positions Section */}
        <View style={styles.positionsSection}>
          <Text
            variant={TextVariant.HeadingSM}
            color={TextColor.Default}
            style={styles.sectionTitle}
          >
            {isLoading && !hasInitialLoad ? (
              <Skeleton height={20} width={150} />
            ) : (
              `Open Positions (${positions.length})`
            )}
          </Text>

          {isLoading && !hasInitialLoad ? (
            renderSkeletonPositions()
          ) : positions.length > 0 ? (
            <FlatList
              data={positions}
              keyExtractor={(item) => item.id}
              renderItem={renderPositionItem}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text
                variant={TextVariant.BodyMD}
                color={TextColor.Muted}
                style={styles.emptyStateText}
              >
                No open positions
              </Text>
              <Text variant={TextVariant.BodySM} color={TextColor.Muted}>
                Start trading to see your positions here
              </Text>
            </View>
          )}
        </View>

        {/* Refresh Button */}
        <View style={styles.buttonContainer}>
          <Button
            variant={ButtonVariants.Secondary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label="Refresh Positions"
            onPress={handleRefresh}
            loading={isLoading}
            style={styles.button}
          />
        </View>
      </View>
    </ScreenView>
  );
};

export default PerpsPositionsView;
