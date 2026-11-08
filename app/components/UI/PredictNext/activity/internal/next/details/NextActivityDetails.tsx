import React from 'react';
import type { ActivityListItem } from '../../../../../../../util/activity-adapters';
import { PredictFundsDetails } from '../../legacy/details/PredictFundsDetails';
import { NextSettlementDetails } from './NextSettlementDetails';
import { NextTradeDetails } from './NextTradeDetails';

/**
 * The next branch's details template for `prediction*` kinds. Trades render
 * in the Polymarket layout, Settlements through the shared Settlement
 * template, which needs no lookup beyond naming a threshold line. Deposits
 * and Withdraws are wallet transactions, not Predict Activity, so they render
 * as on every lane.
 */
export function NextActivityDetails({
  item,
}: Readonly<{ item: ActivityListItem }>) {
  switch (item.type) {
    case 'predictionPlaced':
    case 'predictionCashedOut':
      return <NextTradeDetails item={item} />;
    case 'predictionSettled':
      return <NextSettlementDetails item={item} />;
    case 'predictionsAddFunds':
    case 'predictionsWithdrawFunds':
      return <PredictFundsDetails item={item} />;
    default:
      return null;
  }
}
