import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import Engine from '../../../../../core/Engine';
import { usePredictPositions } from '../../hooks/usePredictPositions';
import { PredictPositionsHeaderHandle } from '../PredictPositionsHeader';
import PredictHomeAccountState from './PredictHomeAccountState';
import PredictHomeFeatured from './PredictHomeFeatured';
import PredictHomePositionList from './PredictHomePositionList';
import PredictHomeSkeleton from './PredictHomeSkeleton';

export interface PredictHomePositionsHandle {
  refresh: () => Promise<void>;
}

interface PredictHomePositionsProps {
  isVisible?: boolean;
  onError?: (error: string | null) => void;
}

const PredictHomePositions = forwardRef<
  PredictHomePositionsHandle,
  PredictHomePositionsProps
>(({ isVisible, onError }, ref) => {
  const accountStateRef = useRef<PredictPositionsHeaderHandle>(null);
  const [accountStateError, setAccountStateError] = useState<string | null>(
    null,
  );

  const {
    positions: activePositions,
    isRefreshing,
    loadPositions,
    isLoading: isActiveLoading,
    error: activeError,
  } = usePredictPositions({
    loadOnMount: true,
    refreshOnFocus: true,
  });

  const {
    positions: claimablePositions,
    loadPositions: loadClaimablePositions,
    isLoading: isClaimableLoading,
    error: claimableError,
  } = usePredictPositions({
    claimable: true,
    loadOnMount: true,
    refreshOnFocus: true,
  });

  const isLoading = isActiveLoading || isClaimableLoading;
  const hasPositions =
    activePositions.length > 0 || claimablePositions.length > 0;

  useEffect(() => {
    const combinedError = activeError || claimableError || accountStateError;
    onError?.(combinedError);
  }, [activeError, claimableError, accountStateError, onError]);

  useImperativeHandle(ref, () => ({
    refresh: async () => {
      await Promise.all([
        loadPositions({ isRefresh: true }),
        loadClaimablePositions({ isRefresh: true }),
        accountStateRef.current?.refresh(),
      ]);
    },
  }));

  useEffect(() => {
    if (isVisible && !isLoading) {
      Engine.context.PredictController.trackPositionViewed({
        openPositionsCount: activePositions.length,
      });
    }
  }, [isVisible, isLoading, activePositions.length]);

  const handleAccountStateError = useCallback((error: string | null) => {
    setAccountStateError(error);
  }, []);

  const showSkeleton = isLoading || (isRefreshing && !hasPositions);

  if (showSkeleton) {
    return <PredictHomeSkeleton />;
  }

  if (!hasPositions) {
    return <PredictHomeFeatured />;
  }

  return (
    <>
      <PredictHomeAccountState
        ref={accountStateRef}
        onError={handleAccountStateError}
      />
      <PredictHomePositionList
        activePositions={activePositions}
        claimablePositions={claimablePositions}
      />
    </>
  );
});

PredictHomePositions.displayName = 'PredictHomePositions';

export default PredictHomePositions;
