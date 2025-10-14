import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { default as React, useRef, useState, useCallback } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import PredictAccountState, {
  PredictAccountStateHandle,
} from '../../components/PredictAccountState';
import PredictClaimablePositions, {
  PredictClaimablePositionsHandle,
} from '../../components/PredictClaimablePositions/PredictClaimablePositions';
import PredictPositions, {
  PredictPositionsHandle,
} from '../../components/PredictPositions/PredictPositions';

interface PredictTabViewProps {}

const PredictTabView: React.FC<PredictTabViewProps> = () => {
  const tw = useTailwind();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const predictPositionsRef = useRef<PredictPositionsHandle>(null);
  const predictClaimablePositionsRef =
    useRef<PredictClaimablePositionsHandle>(null);
  const predictAccountStateRef = useRef<PredictAccountStateHandle>(null);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        predictPositionsRef.current?.refresh(),
        predictClaimablePositionsRef.current?.refresh(),
        predictAccountStateRef.current?.refresh(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  return (
    <View style={tw.style('flex-1 bg-default')}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        <PredictAccountState ref={predictAccountStateRef} />
        <PredictPositions ref={predictPositionsRef} />
        <PredictClaimablePositions ref={predictClaimablePositionsRef} />
      </ScrollView>
    </View>
  );
};

export default PredictTabView;
