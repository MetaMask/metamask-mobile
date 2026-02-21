import React, { useEffect, useState, useCallback, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { Box } from '@metamask/design-system-react-native';
import { useAppTheme } from '../../../../../util/theme';
import { Colors } from '../../../../../util/theme/models';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { usePerpsDepositProgress } from '../../hooks/usePerpsDepositProgress';
import { useWithdrawalRequests } from '../../hooks/useWithdrawalRequests';
import { usePerpsSelector } from '../../hooks/usePerpsSelector';
import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import Engine from '../../../../../core/Engine';
import DevLogger from '../../../../../core/SDKConnect/utils/DevLogger';
import {
  ZERO_BALANCE,
  HYPERLIQUID_WITHDRAWAL_PROGRESS_INTERVAL_MS,
  WITHDRAWAL_PROGRESS_STAGES,
  PROGRESS_BAR_COMPLETION_DELAY_MS,
} from '../../constants/hyperLiquidConfig';

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
  /**
   * Callback to pass withdrawal amount to parent
   */
  onWithdrawalAmountChange?: (amount: string | null) => void;
}

/**
 * PerpsProgressBar - A customizable progress bar component
 *
 * Renders two overlayed Box components where the top Box represents
 * the progress as a percentage of the background Box width.
 *
 * Always animates to 100% before disappearing to provide visual feedback
 * that the operation completed successfully.
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
  onWithdrawalAmountChange,
}) => {
  const { colors } = useAppTheme();
  const styles = createStyles(colors, height);
  const { isDepositInProgress } = usePerpsDepositProgress();

  // Get withdrawal requests using the hook that combines pending and completed withdrawals
  const { withdrawalRequests } = useWithdrawalRequests({
    skipInitialFetch: false,
  });

  // Get persistent withdrawal progress from controller
  const persistentWithdrawalProgress = usePerpsSelector(
    (state) => state?.withdrawalProgress || { progress: 0, lastUpdated: 0 },
  );

  // Track transaction progress
  const [transactionProgress, setTransactionProgress] = useState(0);
  const [shouldShow, setShouldShow] = useState(false);
  const [lastProgress, setLastProgress] = useState(0);
  const [isAnimatingToComplete, setIsAnimatingToComplete] = useState(false);

  // Use refs to track progress state without triggering re-renders
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentStageRef = useRef(0);

  // Check if there are any pending or bridging withdrawals
  const hasActiveWithdrawals = withdrawalRequests.some(
    (request) => request.status === 'pending' || request.status === 'bridging',
  );

  // Get the most recent active withdrawal for amount tracking
  const activeWithdrawal = withdrawalRequests.find(
    (request) => request.status === 'pending' || request.status === 'bridging',
  );

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
      default:
        return 0;
    }
  };

  // Helper function to animate to 100% and then hide
  const animateToCompleteAndHide = useCallback(() => {
    if (isAnimatingToComplete) return; // Prevent multiple animations

    setIsAnimatingToComplete(true);

    // Animate to 100%
    progressWidth.value = withTiming(100, {
      duration: PROGRESS_BAR_COMPLETION_DELAY_MS,
      easing: Easing.out(Easing.cubic),
    });

    // Hide after animation completes
    setTimeout(() => {
      setShouldShow(false);
      setIsAnimatingToComplete(false);

      // Clear persistent progress for withdrawals
      const controller = Engine.context.PerpsController;
      if (controller) {
        controller.updateWithdrawalProgress(0);
      }
    }, PROGRESS_BAR_COMPLETION_DELAY_MS);
  }, [isAnimatingToComplete, progressWidth]);

  // Listen for transaction status updates
  useEffect(() => {
    const handleTransactionStatusUpdate = ({
      transactionMeta,
    }: {
      transactionMeta: TransactionMeta;
    }) => {
      if (
        transactionMeta.type === TransactionType.perpsDeposit ||
        transactionMeta.type === TransactionType.perpsDepositAndOrder
      ) {
        const progress = getProgressFromStatus(transactionMeta.status);
        setTransactionProgress(progress);

        // Extract transaction amount from metamaskPay.totalFiat (for ERC-20 transfers)
        if (transactionMeta.metamaskPay?.totalFiat) {
          onTransactionAmountChange?.(transactionMeta.metamaskPay.totalFiat);
        } else if (
          transactionMeta.txParams?.value &&
          transactionMeta.txParams.value !== ZERO_BALANCE
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

  // Track withdrawal progress throughout the entire withdrawal lifecycle
  useEffect(() => {
    // Clear any existing interval when effect runs
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    if (hasActiveWithdrawals && activeWithdrawal?.id) {
      // Show progress bar immediately when withdrawal starts
      setShouldShow(true);

      // Pass withdrawal amount to parent
      if (activeWithdrawal?.amount) {
        onWithdrawalAmountChange?.(activeWithdrawal.amount);
      }

      // Check if we have existing progress for this withdrawal
      const existingProgress = persistentWithdrawalProgress.progress;
      const isSameWithdrawal =
        persistentWithdrawalProgress.activeWithdrawalId === activeWithdrawal.id;

      // If we have existing progress for the same withdrawal, continue from there
      // Otherwise, start fresh
      if (isSameWithdrawal && existingProgress > 0) {
        // Continue from existing progress
        // Find the current stage based on progress
        currentStageRef.current = WITHDRAWAL_PROGRESS_STAGES.findIndex(
          (stage) => stage > existingProgress,
        );
        if (currentStageRef.current === -1)
          currentStageRef.current = WITHDRAWAL_PROGRESS_STAGES.length;
      } else {
        // Start fresh - set initial progress
        const controller = Engine.context.PerpsController;
        if (controller) {
          controller.updateWithdrawalProgress(25, activeWithdrawal.id);
        }
        currentStageRef.current = 1; // Start from second stage
      }

      // Simulate withdrawal progress stages - 5 minutes total, every 30 seconds
      progressIntervalRef.current = setInterval(() => {
        if (currentStageRef.current < WITHDRAWAL_PROGRESS_STAGES.length) {
          const progress = WITHDRAWAL_PROGRESS_STAGES[currentStageRef.current];

          // Update controller with persistent progress
          const controller = Engine.context.PerpsController;
          if (controller && activeWithdrawal?.id) {
            controller.updateWithdrawalProgress(progress, activeWithdrawal.id);
          }

          currentStageRef.current++;
        } else {
          // Keep at 98% until withdrawal is actually completed
          const controller = Engine.context.PerpsController;
          if (controller && activeWithdrawal?.id) {
            controller.updateWithdrawalProgress(98, activeWithdrawal.id);
          }
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
          }
        }
      }, HYPERLIQUID_WITHDRAWAL_PROGRESS_INTERVAL_MS); // Progress every 30 seconds
    }

    // Cleanup function
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, [
    hasActiveWithdrawals,
    activeWithdrawal?.id,
    onWithdrawalAmountChange,
    activeWithdrawal?.amount,
    persistentWithdrawalProgress.progress,
    persistentWithdrawalProgress.activeWithdrawalId,
  ]);

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
        setLastProgress(transactionProgress);
      }

      progressWidth.value = withTiming(transactionProgress, {
        duration: 1000,
        easing: Easing.out(Easing.cubic),
      });
    } else if (hasActiveWithdrawals) {
      setShouldShow(true);

      // Use persistent progress for animation
      const currentProgress = persistentWithdrawalProgress.progress;

      // Trigger haptic feedback when progress increases
      if (currentProgress > lastProgress) {
        setLastProgress(currentProgress);
      }

      progressWidth.value = withTiming(currentProgress, {
        duration: 1000,
        easing: Easing.out(Easing.cubic),
      });
    } else if (
      shouldShow &&
      !isDepositInProgress &&
      !hasActiveWithdrawals &&
      !isAnimatingToComplete
    ) {
      // Any transaction completion case - always animate to 100% before hiding
      // If we were showing progress and now no transactions are in progress, it's complete
      animateToCompleteAndHide();
    } else if (!isDepositInProgress && !hasActiveWithdrawals && !shouldShow) {
      // Default progress bar behavior when not showing
      progressWidth.value = withTiming(progressAmount, {
        duration: 1000,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [
    progressAmount,
    transactionProgress,
    persistentWithdrawalProgress,
    isDepositInProgress,
    hasActiveWithdrawals,
    shouldShow,
    progressWidth,
    lastProgress,
    isAnimatingToComplete,
    animateToCompleteAndHide,
  ]);

  if (!shouldShow && !isDepositInProgress && !hasActiveWithdrawals) {
    return null;
  }

  return (
    <Box style={styles.progress} testID="perps-progress-bar">
      {/* Progress Box - overlayed on top with animated width */}
      <Animated.View style={[styles.progressDone, animatedProgressStyle]} />
    </Box>
  );
};

export default PerpsProgressBar;
