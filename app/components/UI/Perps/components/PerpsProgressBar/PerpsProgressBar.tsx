import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Box } from '@metamask/design-system-react-native';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { useAppTheme } from '../../../../../util/theme';
import { Colors } from '../../../../../util/theme/models';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { usePerpsDepositProgress } from '../../hooks/usePerpsDepositProgress';
import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import Engine from '../../../../../core/Engine';
import DevLogger from '../../../../../core/SDKConnect/utils/DevLogger';

interface PerpsProgressBarProps {
  /**
   * Progress amount as a number between 0 and 100
   */
  progressAmount: number;
  /**
   * Background color for the progress bar container
   */
  bgColor?: string;
  /**
   * Color for the progress indicator
   */
  progressColor?: string;
  /**
   * Height of the progress bar
   */
  height?: number;
  /**
   * Callback to pass transaction amount to parent
   */
  onTransactionAmountChange?: (amount: string | null) => void;
}

/**
 * PerpsProgressBar - A customizable progress bar component
 *
 * Renders two overlayed Box components where the top Box represents
 * the progress as a percentage of the background Box width.
 *
 * @example
 * <PerpsProgressBar
 *   progressAmount={75}
 *   bgColor="bg-muted"
 *   progressColor="bg-primary-default"
 * />
 */
const createStyles = (colors: Colors, height: number) =>
  StyleSheet.create({
    progress: {
      backgroundColor: colors.background.muted,
      borderRadius: height / 2,
      position: 'relative',
      height,
      width: '100%',
      overflow: 'hidden',
    },
    progressDone: {
      backgroundColor: colors.primary.default,
      borderRadius: height / 2,
      height: '100%',
      position: 'absolute',
      top: 0,
      left: 0,
    },
  });

export const PerpsProgressBar: React.FC<PerpsProgressBarProps> = ({
  progressAmount,
  height = 4,
  onTransactionAmountChange,
}) => {
  const { colors } = useAppTheme();
  const styles = createStyles(colors, height);
  const { isDepositInProgress } = usePerpsDepositProgress();

  // Track transaction progress
  const [transactionProgress, setTransactionProgress] = useState(0);
  const [shouldShow, setShouldShow] = useState(false);
  const [lastProgress, setLastProgress] = useState(0);

  // Shared value for animation
  const progressWidth = useSharedValue(0);

  // Calculate progress based on transaction status
  const getProgressFromStatus = (status: TransactionStatus): number => {
    switch (status) {
      case TransactionStatus.signed:
        return 25;
      case TransactionStatus.submitted:
        return 50;
      case TransactionStatus.confirmed:
        return 75;
    }
  };

  // Listen for transaction status updates
  useEffect(() => {
    const handleTransactionStatusUpdate = ({
      transactionMeta,
    }: {
      transactionMeta: TransactionMeta;
    }) => {
      if (transactionMeta.type === TransactionType.perpsDeposit) {
        const progress = getProgressFromStatus(transactionMeta.status);
        setTransactionProgress(progress);

        // Extract transaction amount from metamaskPay.totalFiat (for ERC-20 transfers)
        if (transactionMeta.metamaskPay?.totalFiat) {
          onTransactionAmountChange?.(transactionMeta.metamaskPay.totalFiat);
        } else if (
          transactionMeta.txParams?.value &&
          transactionMeta.txParams.value !== '0x0'
        ) {
          // Fallback for native ETH transfers

          onTransactionAmountChange?.(transactionMeta.txParams.value);
        } else {
          DevLogger.log('No transaction amount found');
        }
      }
    };

    Engine.controllerMessenger.subscribe(
      'TransactionController:transactionStatusUpdated',
      handleTransactionStatusUpdate,
    );

    return () => {
      Engine.controllerMessenger.unsubscribe(
        'TransactionController:transactionStatusUpdated',
        handleTransactionStatusUpdate,
      );
    };
  }, [onTransactionAmountChange]);

  // Animated style for the progress bar
  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  // Update animation when progress changes
  useEffect(() => {
    if (isDepositInProgress) {
      setShouldShow(true);

      // Trigger haptic feedback when progress increases
      if (transactionProgress > lastProgress) {
        impactAsync(ImpactFeedbackStyle.Light);
        setLastProgress(transactionProgress);
      }

      progressWidth.value = withTiming(transactionProgress, {
        duration: 1000,
        easing: Easing.out(Easing.cubic),
      });
    } else if (shouldShow && transactionProgress === 75) {
      // Animate to 100% before hiding
      progressWidth.value = withTiming(100, {
        duration: 500,
        easing: Easing.out(Easing.cubic),
      });
      // Trigger completion haptic
      impactAsync(ImpactFeedbackStyle.Medium);
      // Hide after animation completes
      setTimeout(() => setShouldShow(false), 500);
    } else if (!isDepositInProgress) {
      progressWidth.value = withTiming(progressAmount, {
        duration: 1000,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [
    progressAmount,
    transactionProgress,
    isDepositInProgress,
    shouldShow,
    progressWidth,
    lastProgress,
  ]);

  if (!shouldShow && !isDepositInProgress) {
    return null;
  }

  return (
    <Box style={styles.progress}>
      {/* Progress Box - overlayed on top with animated width */}
      <Animated.View style={[styles.progressDone, animatedProgressStyle]} />
    </Box>
  );
};

export default PerpsProgressBar;
