import { useRef, useEffect } from 'react';
import { RiveRef } from 'rive-react-native';

// These come from the Rive file, need to go into the Rive Editor to see them, or talk to designers
const STATE_MACHINE_NAME = 'State Machine 1';
enum RewardsIconTriggers {
  Disable = 'Disable',
  Start = 'Start',
  Refresh = 'Refresh',
}

interface UseRewardsIconAnimationParams {
  isRewardsLoading: boolean;
  estimatedPoints: number | null;
  hasRewardsError: boolean;
  shouldShowRewardsRow: boolean;
  isRefresh?: boolean;
}

interface UseRewardsIconAnimationResult {
  riveRef: React.RefObject<RiveRef>;
}

export const useRewardsIconAnimation = ({
  isRewardsLoading,
  estimatedPoints,
  hasRewardsError,
  shouldShowRewardsRow,
  isRefresh = false,
}: UseRewardsIconAnimationParams): UseRewardsIconAnimationResult => {
  const riveRef = useRef<RiveRef>(null);
  const previousPointsRef = useRef<number | null>(null);

  // Handle Rive animation triggers based on points state changes
  useEffect(() => {
    if (!shouldShowRewardsRow || !riveRef.current) {
      return;
    }

    const currentPoints = hasRewardsError ? 0 : estimatedPoints;
    const previousPoints = previousPointsRef.current;

    // Skip if no change in points value
    if (!isRewardsLoading && currentPoints === previousPoints) {
      return;
    }

    try {
      if ((shouldShowRewardsRow && isRewardsLoading) || hasRewardsError) {
        // Loading or error state - trigger Disable
        riveRef.current.fireState(
          STATE_MACHINE_NAME,
          RewardsIconTriggers.Disable,
        );
        return;
      }

      if (isRefresh && currentPoints && currentPoints > 0) {
        // Refresh state - trigger spin animation
        riveRef.current.fireState(
          STATE_MACHINE_NAME,
          RewardsIconTriggers.Refresh,
        );
        return;
      }

      if (currentPoints && currentPoints > 0) {
        // Has points - trigger Start
        riveRef.current.fireState(
          STATE_MACHINE_NAME,
          RewardsIconTriggers.Start,
        );
      }
    } catch (error) {
      console.warn('Error triggering Rive animation:', error);
    }

    // Update previous points reference
    previousPointsRef.current = currentPoints;
  }, [
    estimatedPoints,
    hasRewardsError,
    isRewardsLoading,
    shouldShowRewardsRow,
    isRefresh,
  ]);

  return {
    riveRef,
  };
};
