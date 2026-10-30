import React from 'react';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import { PredictImplementationSwitch } from '../implementation';
import { PredictDetails } from './internal/legacy/details/PredictDetails';
import { PredictFundsDetails } from './internal/legacy/details/PredictFundsDetails';
import type { PredictActivityListItem } from './internal/legacy/details/PredictDetails.types';

const isPredictFundsItem = (
  item: ActivityListItem,
): item is PredictActivityListItem =>
  item.type === 'predictionsAddFunds' ||
  item.type === 'predictionsWithdrawFunds';

export interface PredictActivityDetailsProps {
  item: ActivityListItem;
}

/**
 * The Activity details template for every `prediction*` kind. The legacy
 * branch renders the existing Predict templates unchanged. Deposits and
 * Withdraws are wallet transactions, not Predict Activity, so the next branch
 * renders them the same way; it renders Trades and Settlements from E5
 * (PRED-1410).
 */
export const PredictActivityDetails = ({
  item,
}: PredictActivityDetailsProps) => (
  <PredictImplementationSwitch
    legacy={<PredictDetails item={item} />}
    next={isPredictFundsItem(item) ? <PredictFundsDetails item={item} /> : null}
    resolving={null}
  />
);
