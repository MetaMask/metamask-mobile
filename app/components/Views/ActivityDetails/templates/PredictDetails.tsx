import React from 'react';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import { PredictFundsDetails } from './PredictDetails/PredictFundsDetails';
import { PredictProviderActivityDetails } from './PredictDetails/PredictProviderActivityDetails';
import { asPredictActivityItem } from './PredictDetails/PredictDetails.types';

export function PredictDetails({ item }: { item: ActivityListItem }) {
  const predictItem = asPredictActivityItem(item);

  if (
    predictItem.type === 'predictionsAddFunds' ||
    predictItem.type === 'predictionsWithdrawFunds'
  ) {
    return <PredictFundsDetails item={predictItem} />;
  }

  if (
    predictItem.type === 'predictionPlaced' ||
    predictItem.type === 'predictionCashedOut' ||
    predictItem.type === 'predictionClaimWinnings'
  ) {
    return <PredictProviderActivityDetails item={predictItem} />;
  }

  return null;
}
