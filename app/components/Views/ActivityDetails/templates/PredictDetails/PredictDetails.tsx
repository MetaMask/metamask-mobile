import React from 'react';
import type { ActivityListItem } from '../../../../../util/activity-adapters';
import { PredictFundsDetails } from './PredictFundsDetails';
import { PredictProviderActivityDetails } from './PredictProviderActivityDetails';
import type { PredictActivityListItem } from './PredictDetails.types';

export function PredictDetails({ item }: { item: ActivityListItem }) {
  const predictItem = item as PredictActivityListItem;

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
