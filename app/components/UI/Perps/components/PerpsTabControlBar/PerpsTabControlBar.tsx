import React, { useCallback, useEffect, useState, useRef } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useStyles } from '../../../../../component-library/hooks';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../../locales/i18n';
import styleSheet from './PerpsTabControlBar.styles';
import {
  usePerpsTrading,
  useColorPulseAnimation,
  useBalanceComparison,
} from '../../hooks';
import { AccountState } from '../../controllers';
import DevLogger from '../../../../../core/SDKConnect/utils/DevLogger';
import { formatPerpsFiat } from '../../utils/formatUtils';

interface PerpsTabControlBarProps {
  onManageBalancePress?: () => void;
}

export const PerpsTabControlBar: React.FC<PerpsTabControlBarProps> = ({
  onManageBalancePress,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const [result, setResult] = useState<AccountState>({
    totalBalance: '',
    availableBalance: '',
    marginUsed: '',
    unrealizedPnl: '',
  });

  const { getAccountState, subscribeToPositions } = usePerpsTrading();

  // Use the reusable hooks
  const { startPulseAnimation, getAnimatedStyle, stopAnimation } =
    useColorPulseAnimation();
  const { compareAndUpdateBalance } = useBalanceComparison();

  const getAccountBalance = useCallback(async () => {
    DevLogger.log('PerpsTabControlBar: Getting account balance');
    try {
      const accountState = await getAccountState();

      // Compare with previous balance and get animation type
      const balanceChange = compareAndUpdateBalance(accountState.totalBalance);

      // Start pulse animation with appropriate color
      try {
        startPulseAnimation(balanceChange);
      } catch (animationError) {
        DevLogger.log('PerpsTabControlBar: Animation error:', animationError);
      } finally {
        setResult(accountState);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : strings('perps.errors.unknownError');
      const fullErrorMessage = strings('perps.errors.accountBalanceFailed', {
        error: errorMessage,
      });
      DevLogger.log(
        'PerpsTabControlBar: Error getting account balance:',
        fullErrorMessage,
      );
    }
  }, [getAccountState, startPulseAnimation, compareAndUpdateBalance]);

  // Track last positions hash to detect actual changes
  const lastPositionsHashRef = useRef<string>('');

  // Auto-refresh setup with WebSocket subscription + polling fallback
  useEffect(() => {
    // Initial load
    getAccountBalance();

    // Set up WebSocket subscription for real-time position updates
    let unsubscribePositions: (() => void) | null = null;

    try {
      unsubscribePositions = subscribeToPositions({
        callback: (positions) => {
          // Create a simple hash of positions to detect actual changes
          const positionsHash = JSON.stringify(
            positions.map((p) => ({
              coin: p.coin,
              size: p.size,
              entryPrice: p.entryPrice,
              unrealizedPnl: p.unrealizedPnl,
            })),
          );

          // Only refresh if positions actually changed
          if (positionsHash !== lastPositionsHashRef.current) {
            DevLogger.log(
              'PerpsTabControlBar: Position change detected, refreshing balance',
            );
            lastPositionsHashRef.current = positionsHash;
            getAccountBalance();
          }
        },
      });
    } catch (error) {
      DevLogger.log(
        'PerpsTabControlBar: Failed to subscribe to positions, using polling only',
        error,
      );
    }

    return () => {
      // Cleanup WebSocket subscription
      if (unsubscribePositions) {
        unsubscribePositions();
      }

      // Cleanup animations
      stopAnimation();
    };
  }, [getAccountBalance, subscribeToPositions, stopAnimation]);

  const handlePress = () => {
    onManageBalancePress?.();
  };

  return (
    <TouchableOpacity style={styles.wrapper} onPress={handlePress}>
      <View style={styles.balanceContainer}>
        <Text
          variant={TextVariant.BodySM}
          color={TextColor.Alternative}
          style={styles.titleText}
        >
          {strings('perps.perp_account_balance')}
        </Text>
        <Animated.View style={[styles.balanceText, getAnimatedStyle]}>
          <Text variant={TextVariant.HeadingSM} color={TextColor.Default}>
            {formatPerpsFiat(result.availableBalance || '0')}
          </Text>
        </Animated.View>
      </View>
      <View style={styles.arrowContainer}>
        <Icon
          name={IconName.ArrowRight}
          size={IconSize.Md}
          color={IconColor.Alternative}
        />
      </View>
    </TouchableOpacity>
  );
};

export default PerpsTabControlBar;
