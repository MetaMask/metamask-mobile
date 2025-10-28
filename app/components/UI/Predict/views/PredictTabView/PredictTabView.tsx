import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { default as React, useRef, useState, useCallback } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import PredictPositionsHeader, {
  PredictPositionsHeaderHandle,
} from '../../components/PredictPositionsHeader';
import PredictPositions, {
  PredictPositionsHandle,
} from '../../components/PredictPositions/PredictPositions';
import PredictAddFundsSheet from '../../components/PredictAddFundsSheet/PredictAddFundsSheet';
import PredictOffline from '../../components/PredictOffline/PredictOffline';
import { usePredictDepositToasts } from '../../hooks/usePredictDepositToasts';
import { usePredictClaimToasts } from '../../hooks/usePredictClaimToasts';
import { PredictTabViewSelectorsIDs } from '../../../../../../e2e/selectors/Predict/Predict.selectors';
import { usePredictWithdrawToasts } from '../../hooks/usePredictWithdrawToasts';

interface PredictTabViewProps {}

const PredictTabView: React.FC<PredictTabViewProps> = () => {
  const tw = useTailwind();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [positionsError, setPositionsError] = useState<string | null>(null);
  const [headerError, setHeaderError] = useState<string | null>(null);

  const predictPositionsRef = useRef<PredictPositionsHandle>(null);
  const predictPositionsHeaderRef = useRef<PredictPositionsHeaderHandle>(null);

  usePredictDepositToasts();
  usePredictClaimToasts();
  usePredictWithdrawToasts();

  const hasError = Boolean(positionsError || headerError);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // Clear errors before refreshing
    setPositionsError(null);
    setHeaderError(null);
    try {
      await Promise.all([
        predictPositionsRef.current?.refresh(),
        predictPositionsHeaderRef.current?.refresh(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const handlePositionsError = useCallback((error: string | null) => {
    setPositionsError(error);
  }, []);

  const handleHeaderError = useCallback((error: string | null) => {
    setHeaderError(error);
  }, []);

  return (
    <View style={tw.style('flex-1 bg-default')}>
      {hasError ? (
        <PredictOffline onRetry={handleRefresh} />
      ) : (
        <ScrollView
          testID={PredictTabViewSelectorsIDs.SCROLL_VIEW}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
            />
          }
        >
          <PredictPositionsHeader
            ref={predictPositionsHeaderRef}
            onError={handleHeaderError}
          />
          <PredictPositions
            ref={predictPositionsRef}
            onError={handlePositionsError}
          />
          <PredictAddFundsSheet />
        </ScrollView>
      )}
    </View>
  );
};

export default PredictTabView;
