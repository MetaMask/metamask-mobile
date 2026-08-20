import React, { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectNonRegTimeSportsMarketTypes } from '../selectors/featureFlags';
import { shouldShowRegTimeTag } from '../constants/sports';
import type { PredictMarketGame } from '../types';
import { usePredictBottomSheet } from './usePredictBottomSheet';
import PredictRegTimeInfoSheet from '../components/PredictGameDetailsContent/PredictRegTimeInfoSheet';

interface UsePredictRegTimeBuyAccessoryParams {
  game?: PredictMarketGame;
  sportsMarketType?: string;
}

export const usePredictRegTimeBuyAccessory = ({
  game,
  sportsMarketType,
}: UsePredictRegTimeBuyAccessoryParams) => {
  const nonRegTimeSportsMarketTypes = useSelector(
    selectNonRegTimeSportsMarketTypes,
  );
  const { sheetRef, isVisible, handleSheetClosed, getRefHandlers } =
    usePredictBottomSheet();
  const regTimeSheetHandlers = useMemo(
    () => getRefHandlers(),
    [getRefHandlers],
  );
  const onRegTimeInfoPress = useCallback(() => {
    regTimeSheetHandlers.onOpenBottomSheet();
  }, [regTimeSheetHandlers]);
  const showRegTimeTag = shouldShowRegTimeTag({
    game,
    sportsMarketType,
    nonRegTimeSportsMarketTypes,
  });

  const regTimeInfoSheet = isVisible ? (
    <PredictRegTimeInfoSheet ref={sheetRef} onClose={handleSheetClosed} />
  ) : null;

  return {
    showRegTimeTag,
    onRegTimeInfoPress,
    regTimeInfoSheet,
  };
};
