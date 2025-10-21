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
import { usePredictDepositToasts } from '../../hooks/usePredictDepositToasts';
import { usePredictClaimToasts } from '../../hooks/usePredictClaimToasts';
import { PredictTabViewSelectorsIDs } from '../../../../../../e2e/selectors/Predict/Predict.selectors';

interface PredictTabViewProps {}

const PredictTabView: React.FC<PredictTabViewProps> = () => {
  const tw = useTailwind();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const predictPositionsRef = useRef<PredictPositionsHandle>(null);
  const predictPositionsHeaderRef = useRef<PredictPositionsHeaderHandle>(null);

  usePredictDepositToasts();
  usePredictClaimToasts();

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        predictPositionsRef.current?.refresh(),
        predictPositionsHeaderRef.current?.refresh(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  return (
    <View style={tw.style('flex-1 bg-default')}>
      <ScrollView
        testID={PredictTabViewSelectorsIDs.SCROLL_VIEW}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        <PredictPositionsHeader ref={predictPositionsHeaderRef} />
        <PredictPositions ref={predictPositionsRef} />
        <PredictAddFundsSheet />
      </ScrollView>
    </View>
  );
};

export default PredictTabView;
