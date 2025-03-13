import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectSwapsChainFeatureFlags } from '../../../../reducers/swaps';

export const FALLBACK_STX_ESTIMATED_DEADLINE_SEC = 45;
export const FALLBACK_STX_MAX_DEADLINE_SEC = 150;

interface Props {
  creationTime: number | undefined;
  isStxPending: boolean;
}

const useRemainingTime = ({ creationTime, isStxPending }: Props) => {
  const swapFeatureFlags = useSelector(selectSwapsChainFeatureFlags);

  const [isStxPastEstimatedDeadline, setIsStxPastEstimatedDeadline] =
    useState(false);

  const stxEstimatedDeadlineSec =
    swapFeatureFlags?.smartTransactions?.expectedDeadline ||
    FALLBACK_STX_ESTIMATED_DEADLINE_SEC;
  const stxMaxDeadlineSec =
    swapFeatureFlags?.smartTransactions?.maxDeadline ||
    FALLBACK_STX_MAX_DEADLINE_SEC;

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
        if (secondsAfterStxSubmission > stxDeadlineSec) {
          if (isStxPastEstimatedDeadline) {
            setTimeLeftForPendingStxInSec(0);
            clearInterval(intervalId);
            return;
          }
          setIsStxPastEstimatedDeadline(true);
        }
        setTimeLeftForPendingStxInSec(
          stxDeadlineSec - secondsAfterStxSubmission,
        );
      };
      intervalId = setInterval(calculateRemainingTime, 1000);
      calculateRemainingTime();
    }

    return () => clearInterval(intervalId);
  }, [isStxPending, isStxPastEstimatedDeadline, creationTime, stxDeadlineSec]);

  return {
    timeLeftForPendingStxInSec,
    stxDeadlineSec,
    isStxPastEstimatedDeadline,
  };
};

export default useRemainingTime;
