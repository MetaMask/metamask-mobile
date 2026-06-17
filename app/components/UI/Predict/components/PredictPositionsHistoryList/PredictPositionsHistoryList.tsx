import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import { PredictPositionsHistoryListSelectorsIDs } from '../../Predict.testIds';
import type { PredictPosition } from '../../types';
import PredictTransactionsView from '../../views/PredictTransactionsView';
import PredictPositionsEmpty from '../PredictPositionsEmpty';

interface PredictPositionsHistoryListProps {
  claimPendingPositions?: PredictPosition[];
  onClaimPendingPositionsRefresh?: () => Promise<unknown> | void;
  isPrivacyMode?: boolean;
  isVisible: boolean;
}

const PredictPositionsHistoryList = ({
  claimPendingPositions,
  onClaimPendingPositionsRefresh,
  isPrivacyMode = false,
  isVisible,
}: PredictPositionsHistoryListProps) => (
  <Box
    twClassName="flex-1"
    testID={PredictPositionsHistoryListSelectorsIDs.CONTAINER}
  >
    <PredictTransactionsView
      claimPendingPositions={claimPendingPositions}
      onClaimPendingPositionsRefresh={onClaimPendingPositionsRefresh}
      emptyState={<PredictPositionsEmpty />}
      isPrivacyMode={isPrivacyMode}
      isVisible={isVisible}
      containerStyle="p-0"
      activityContainerStyle="px-0"
      shouldTrackActivityViewed={false}
    />
  </Box>
);

export default PredictPositionsHistoryList;
