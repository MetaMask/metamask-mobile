import React from 'react';
import PredictMarketRowItem from '../../../../../../UI/Predict/components/PredictMarketRowItem';
import { PredictEventValues } from '../../../../../../UI/Predict/constants/eventNames';
import type { PredictMarket } from '../../../../../../UI/Predict/types';
import type { TransactionActiveAbTestEntry } from '../../../../../../../util/transactions/transaction-active-ab-test-attribution-registry';
import HomepagePredictDiscoveryMaterialGlyph from './HomepagePredictDiscoveryMaterialGlyph';
import HomepagePredictDiscoveryLivePill from './HomepagePredictDiscoveryLivePill';

interface LiveGameRowProps {
  market: PredictMarket;
  onPress?: () => void;
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
}

const LiveGameRow = ({
  market,
  onPress,
  transactionActiveAbTests,
}: LiveGameRowProps) => (
  <PredictMarketRowItem
    market={market}
    entryPoint={PredictEventValues.ENTRY_POINT.HOME_SECTION}
    showChevron
    leadingAccessory={
      <HomepagePredictDiscoveryMaterialGlyph name="sportsSoccer" />
    }
    endAccessory={
      <HomepagePredictDiscoveryLivePill value={market.game?.elapsed} />
    }
    detailsTitle={market.title}
    onPress={onPress}
    transactionActiveAbTests={transactionActiveAbTests}
    testID="homepage-predict-discovery-live-game-row"
  />
);

export default LiveGameRow;
