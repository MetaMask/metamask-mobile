import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { SafeAreaView, ScrollView, RefreshControl, View } from 'react-native';
import {
  useNavigation,
  useFocusEffect,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';
import {
  IconColor,
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import { useStyles } from '../../../../../component-library/hooks';
import { strings } from '../../../../../../locales/i18n';
import { usePerpsAccount, usePerpsTrading } from '../../hooks';
import PerpsPositionCard from '../../components/PerpsPositionCard';
import type { Position } from '../../controllers/types';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import { formatPnl, formatPrice } from '../../utils/formatUtils';
import { calculateTotalPnL } from '../../utils/pnlCalculations';
import { createStyles } from './PerpsPositionsView.styles';

const PerpsPositionsView: React.FC = () => {
  const { styles, theme } = useStyles(createStyles, {});
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const { getPositions } = usePerpsTrading();
  const cachedAccountState = usePerpsAccount();

  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoize position count text to avoid recalculating on every render
  const positionCountText = useMemo(() => {
    const positionCount = positions.length;
    return positionCount > 1
      ? strings('perps.position.list.position_count_plural', {
          count: positionCount,
        })
      : strings('perps.position.list.position_count', {
          count: positionCount,
        });
  }, [positions]);

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
          <Text variant={TextVariant.BodyMD} color={TextColor.Muted}>
            {strings('perps.position.list.loading')}
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text variant={TextVariant.HeadingSM} color={TextColor.Error}>
            {strings('perps.position.list.error_title')}
          </Text>
          <Text variant={TextVariant.BodySM} color={TextColor.Muted}>
            {error}
          </Text>
        </View>
      );
    }

    if (positions.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text variant={TextVariant.HeadingSM} color={TextColor.Default}>
            {strings('perps.position.list.empty_title')}
          </Text>
          <Text variant={TextVariant.BodySM} color={TextColor.Muted}>
            {strings('perps.position.list.empty_description')}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.positionsSection}>
        <View style={styles.sectionHeader}>
          <Text variant={TextVariant.HeadingSM} color={TextColor.Default}>
            {strings('perps.position.list.open_positions')}
          </Text>
          <Text variant={TextVariant.BodySM} color={TextColor.Muted}>
            {positionCountText}
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
          testID="back-button"
        />
        <Text variant={TextVariant.HeadingSM} color={TextColor.Default}>
          {strings('perps.position.title')}
        </Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary.default}
          />
        }
      >
        {/* Account Summary */}
        <View style={styles.accountSummary}>
          <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
            {strings('perps.position.account.summary_title')}
          </Text>

          <View style={styles.summaryRow}>
            <Text variant={TextVariant.BodySM} color={TextColor.Muted}>
              {strings('perps.position.account.total_balance')}
            </Text>
            <Text variant={TextVariant.BodySMMedium} color={TextColor.Default}>
              {formatPrice(cachedAccountState?.totalBalance || '0')}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text variant={TextVariant.BodySM} color={TextColor.Muted}>
              {strings('perps.position.account.available_balance')}
            </Text>
            <Text variant={TextVariant.BodySMMedium} color={TextColor.Default}>
              {formatPrice(cachedAccountState?.availableBalance || '0')}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text variant={TextVariant.BodySM} color={TextColor.Muted}>
              {strings('perps.position.account.margin_used')}
            </Text>
            <Text variant={TextVariant.BodySMMedium} color={TextColor.Default}>
              {formatPrice(cachedAccountState?.marginUsed || '0')}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text variant={TextVariant.BodySM} color={TextColor.Muted}>
              {strings('perps.position.account.total_unrealized_pnl')}
            </Text>
            <Text
              variant={TextVariant.BodySMMedium}
              color={
                totalUnrealizedPnl >= 0 ? TextColor.Success : TextColor.Error
              }
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
