import React, { useCallback, useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  RefreshControl,
  View,
} from 'react-native';
import {
  useNavigation,
  useFocusEffect,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';
import {
  IconColor,
  IconName,
} from '../../../../component-library/components/Icons/Icon';
import Text from '../../../../component-library/components/Texts/Text';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../component-library/components/Buttons/ButtonIcon';
import { useTheme } from '../../../../util/theme';
import type { Colors } from '../../../../util/theme/models';
import { usePerpsAccount, usePerpsTrading } from '../hooks';
import PerpsPositionCard from '../components/PerpsPositionCard';
import type { Position } from '../controllers/types';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { formatPnl, formatPrice } from '../utils/formatUtils';
import { calculateTotalPnL } from '../utils/pnlCalculations';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text.default,
    },
    accountSummary: {
      backgroundColor: colors.background.alternative,
      margin: 16,
      borderRadius: 12,
      padding: 16,
    },
    summaryTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.default,
      marginBottom: 12,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    summaryLabel: {
      fontSize: 14,
      color: colors.text.muted,
    },
    summaryValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.default,
    },
    totalPnlValue: {
      fontSize: 14,
      fontWeight: '600',
    },
    positivePnl: {
      color: colors.success.default,
    },
    negativePnl: {
      color: colors.error.default,
    },
    positionsSection: {
      flex: 1,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text.default,
    },
    positionCount: {
      fontSize: 14,
      color: colors.text.muted,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      paddingVertical: 64,
    },
    emptyIcon: {
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text.default,
      marginBottom: 8,
      textAlign: 'center',
    },
    emptyDescription: {
      fontSize: 14,
      color: colors.text.muted,
      textAlign: 'center',
      lineHeight: 20,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 64,
    },
    loadingText: {
      fontSize: 16,
      color: colors.text.muted,
      marginTop: 16,
    },
    errorContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      paddingVertical: 64,
    },
    errorTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.error.default,
      marginBottom: 8,
      textAlign: 'center',
    },
    errorDescription: {
      fontSize: 14,
      color: colors.text.muted,
      textAlign: 'center',
      lineHeight: 20,
    },
    headerPlaceholder: {
      width: 32,
    },
  });

const PerpsPositionsView: React.FC = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const { getPositions } = usePerpsTrading();
  const cachedAccountState = usePerpsAccount();

  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load positions data
  const loadPositions = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }
        setError(null);

        // Get positions from controller
        const positionsData = await getPositions();
        setPositions(positionsData || []);

        DevLogger.log('PerpsPositionsView: Loaded positions', {
          count: positionsData?.length || 0,
          positions: positionsData?.map((p) => ({
            coin: p.coin,
            size: p.size,
            pnl: p.unrealizedPnl,
          })),
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load positions';
        setError(errorMessage);
        DevLogger.log('PerpsPositionsView: Error loading positions', err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [getPositions],
  );

  // Load positions on mount
  useEffect(() => {
    loadPositions();
  }, [loadPositions]);

  // Refresh positions when screen comes into focus (e.g., after closing a position)
  useFocusEffect(
    useCallback(() => {
      // Refresh positions data when returning to this screen
      loadPositions(true); // Use refresh mode to avoid showing loading spinner
    }, [loadPositions]),
  );

  // Calculate total unrealized PnL using utility function
  const totalUnrealizedPnl = calculateTotalPnL({ positions });

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleRefresh = () => {
    loadPositions(true);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading positions...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Error Loading Positions</Text>
          <Text style={styles.errorDescription}>{error}</Text>
        </View>
      );
    }

    if (positions.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Open Positions</Text>
          <Text style={styles.emptyDescription}>
            You don&apos;t have any open positions yet.{'\n'}
            Start trading to see your positions here.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.positionsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Open Positions</Text>
          <Text style={styles.positionCount}>
            {positions.length} position{positions.length !== 1 ? 's' : ''}
          </Text>
        </View>
        {positions.map((position, index) => (
          <PerpsPositionCard
            key={`${position.coin}-${index}`}
            position={position}
          />
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          iconColor={IconColor.Default}
          size={ButtonIconSizes.Md}
          onPress={handleBackPress}
        />
        <Text style={styles.headerTitle}>Positions</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary.default}
          />
        }
      >
        {/* Account Summary */}
        <View style={styles.accountSummary}>
          <Text style={styles.summaryTitle}>Account Summary</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Balance</Text>
            <Text style={styles.summaryValue}>
              {formatPrice(cachedAccountState?.totalBalance || '0')}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Available Balance</Text>
            <Text style={styles.summaryValue}>
              {formatPrice(cachedAccountState?.availableBalance || '0')}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Margin Used</Text>
            <Text style={styles.summaryValue}>
              {formatPrice(cachedAccountState?.marginUsed || '0')}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Unrealized P&L</Text>
            <Text
              style={[
                styles.totalPnlValue,
                totalUnrealizedPnl >= 0
                  ? styles.positivePnl
                  : styles.negativePnl,
              ]}
            >
              {formatPnl(totalUnrealizedPnl)}
            </Text>
          </View>
        </View>

        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
};

export default PerpsPositionsView;
