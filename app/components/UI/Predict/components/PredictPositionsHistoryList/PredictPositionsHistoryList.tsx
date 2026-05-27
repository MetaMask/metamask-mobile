import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import { PredictPositionsHistoryListSelectorsIDs } from '../../Predict.testIds';
import PredictTransactionsView from '../../views/PredictTransactionsView';
import PredictPositionsEmpty from '../PredictPositionsEmpty';

interface PredictPositionsHistoryListProps {
  isVisible: boolean;
}

const PredictPositionsHistoryList = ({
  isVisible,
}: PredictPositionsHistoryListProps) => (
  <Box
    twClassName="flex-1"
    testID={PredictPositionsHistoryListSelectorsIDs.CONTAINER}
  >
    <PredictTransactionsView
      emptyState={<PredictPositionsEmpty />}
      isVisible={isVisible}
    />
  </Box>
);

export default PredictPositionsHistoryList;
