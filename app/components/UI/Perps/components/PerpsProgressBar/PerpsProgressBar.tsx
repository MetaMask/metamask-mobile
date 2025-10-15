import React, { useEffect, useState } from 'react';
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

  // Track withdrawal progress throughout the entire withdrawal lifecycle
  useEffect(() => {
    if (hasActiveWithdrawals) {
      // Show progress bar immediately when withdrawal starts
      setShouldShow(true);

      // Pass withdrawal amount to parent
      if (activeWithdrawal?.amount) {
        onWithdrawalAmountChange?.(activeWithdrawal.amount);
      }

      // Check if we have existing progress for this withdrawal
      const existingProgress = persistentWithdrawalProgress.progress;
      const isSameWithdrawal =
        persistentWithdrawalProgress.activeWithdrawalId ===
        activeWithdrawal?.id;

      // If we have existing progress for the same withdrawal, continue from there
      // Otherwise, start fresh
      let currentStage = 0;

      if (isSameWithdrawal && existingProgress > 0) {
        // Continue from existing progress
        // Find the current stage based on progress
        const progressStages = [25, 35, 45, 55, 65, 75, 85, 90, 95, 98];
        currentStage = progressStages.findIndex(
          (stage) => stage > existingProgress,
        );
        if (currentStage === -1) currentStage = progressStages.length;
      } else {
        // Start fresh - set initial progress
        const controller = Engine.context.PerpsController;
        if (controller && activeWithdrawal?.id) {
          controller.updateWithdrawalProgress(25, activeWithdrawal.id);
        }
        currentStage = 1; // Start from second stage
      }

      // Simulate withdrawal progress stages - 5 minutes total, every 30 seconds
      const progressStages = [25, 35, 45, 55, 65, 75, 85, 90, 95, 98];

      const progressInterval = setInterval(() => {
        if (currentStage < progressStages.length) {
          const progress = progressStages[currentStage];

          // Update controller with persistent progress
          const controller = Engine.context.PerpsController;
          if (controller && activeWithdrawal?.id) {
            controller.updateWithdrawalProgress(progress, activeWithdrawal.id);
          }

          currentStage++;
        } else {
          // Keep at 98% until withdrawal is actually completed
          const controller = Engine.context.PerpsController;
          if (controller && activeWithdrawal?.id) {
            controller.updateWithdrawalProgress(98, activeWithdrawal.id);
          }
          clearInterval(progressInterval);
        }
      }, 30000); // Progress every 30 seconds

      return () => clearInterval(progressInterval);
    }
  }, [
    hasActiveWithdrawals,
    activeWithdrawal,
    onWithdrawalAmountChange,
    persistentWithdrawalProgress.progress,
    persistentWithdrawalProgress.activeWithdrawalId,
  ]);

  // Handle withdrawal completion - animate to 100% and hide when withdrawal is truly completed
  useEffect(() => {
    // Check if there was an active withdrawal that just completed
    const completedWithdrawal = withdrawalRequests.find(
      (request) => request.status === 'completed',
    );

    // Check if we were showing progress and now there's a completed withdrawal
    if (completedWithdrawal && shouldShow && !hasActiveWithdrawals) {
      // Withdrawal was completed - animate to 100% and hide
      progressWidth.value = withTiming(100, {
        duration: 500,
        easing: Easing.out(Easing.cubic),
      });
      // Hide after animation completes
      setTimeout(() => {
        setShouldShow(false);
        // Clear persistent progress
        const controller = Engine.context.PerpsController;
        if (controller) {
          controller.updateWithdrawalProgress(0);
        }
      }, 500);
    }
  }, [
    withdrawalRequests,
    persistentWithdrawalProgress,
    shouldShow,
    hasActiveWithdrawals,
    progressWidth,
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
      transactionProgress === 75 &&
      !isDepositInProgress &&
      !hasActiveWithdrawals
    ) {
      // Animate deposit to 100% before hiding (only for completed deposits)
      progressWidth.value = withTiming(100, {
        duration: 500,
        easing: Easing.out(Easing.cubic),
      });
      // Hide after animation completes
      setTimeout(() => setShouldShow(false), 500);
    } else if (
      shouldShow &&
      !isDepositInProgress &&
      !hasActiveWithdrawals &&
      transactionProgress > 0
    ) {
      // Handle failed deposits or any other deposit completion case
      // Animate to 100% and hide
      progressWidth.value = withTiming(100, {
        duration: 500,
        easing: Easing.out(Easing.cubic),
      });
      // Hide after animation completes
      setTimeout(() => setShouldShow(false), 500);
    } else if (!isDepositInProgress && !hasActiveWithdrawals) {
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
  ]);

  if (!shouldShow && !isDepositInProgress && !hasActiveWithdrawals) {
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
