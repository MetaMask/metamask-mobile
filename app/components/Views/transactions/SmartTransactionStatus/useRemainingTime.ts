import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { RootState } from '../../../../reducers';
import { getSmartTransactionsFeatureFlagsForChain } from '../../../../selectors/smartTransactionsController';

export const FALLBACK_STX_ESTIMATED_DEADLINE_SEC = 45;
export const FALLBACK_STX_MAX_DEADLINE_SEC = 150;

interface Props {
  creationTime: number | undefined;
  isStxPending: boolean;
  chainId: Hex;
}

const useRemainingTime = ({ creationTime, isStxPending, chainId }: Props) => {
  const smartTransactionsFeatureFlags = useSelector((state: RootState) =>
    getSmartTransactionsFeatureFlagsForChain(state, chainId),
  );

  const [isStxPastEstimatedDeadline, setIsStxPastEstimatedDeadline] =
    useState(false);

  const stxEstimatedDeadlineSec =
    smartTransactionsFeatureFlags?.expectedDeadline ??
    FALLBACK_STX_ESTIMATED_DEADLINE_SEC;
  const stxMaxDeadlineSec =
    smartTransactionsFeatureFlags?.maxDeadline ?? FALLBACK_STX_MAX_DEADLINE_SEC;

  // Calc time left for progress bar and timer display
  const stxDeadlineSec = isStxPastEstimatedDeadline
    ? stxMaxDeadlineSec
    : stxEstimatedDeadlineSec;

  const [timeLeftForPendingStxInSec, setTimeLeftForPendingStxInSec] = useState(
    stxEstimatedDeadlineSec,
  );

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isStxPending && creationTime) {
      const calculateRemainingTime = () => {
        const secondsAfterStxSubmission = Math.round(
          (Date.now() - creationTime) / 1000,
        );

        // Calculate current deadline fresh based on elapsed time
        const isPastEstimated =
          secondsAfterStxSubmission > stxEstimatedDeadlineSec;
        const currentDeadline = isPastEstimated
          ? stxMaxDeadlineSec
          : stxEstimatedDeadlineSec;

        // Check if past MAX deadline using fresh calculation
        if (secondsAfterStxSubmission > stxMaxDeadlineSec) {
          setTimeLeftForPendingStxInSec(0);
          clearInterval(intervalId);
          return;
        }

        // Update state if transitioning past estimated deadline
        if (isPastEstimated && !isStxPastEstimatedDeadline) {
          setIsStxPastEstimatedDeadline(true);
        }

        setTimeLeftForPendingStxInSec(
          currentDeadline - secondsAfterStxSubmission,
        );
      };
      intervalId = setInterval(calculateRemainingTime, 1000);
      calculateRemainingTime();
    }

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStxPending, creationTime]);

  return {
    timeLeftForPendingStxInSec,
    stxDeadlineSec,
    isStxPastEstimatedDeadline,
  };
};

export default useRemainingTime;
