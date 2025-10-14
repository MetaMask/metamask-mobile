import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { default as React } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import PredictAccountState from '../../components/PredictAccountState';
import PredictClaimablePositions from '../../components/PredictClaimablePositions/PredictClaimablePositions';
import PredictDeposit from '../../components/PredictDeposit/PredictDeposit';
import PredictPositions from '../../components/PredictPositions/PredictPositions';

interface PredictTabViewProps {}

const PredictTabView: React.FC<PredictTabViewProps> = () => {
  const tw = useTailwind();

  const handleRefresh = () => {
    // TODO: implement refresh
  };

  return (
    <View style={tw.style('flex-1 bg-default')}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={handleRefresh} />
        }
      >
        <PredictDeposit />
        <PredictAccountState />
        <PredictPositions />
        <PredictClaimablePositions />
      </ScrollView>
    </View>
  );
};

export default PredictTabView;
