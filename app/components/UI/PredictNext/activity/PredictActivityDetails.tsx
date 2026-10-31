import React from 'react';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import { PredictImplementationSwitch } from '../implementation';
import { PredictDetails } from './internal/legacy/details/PredictDetails';
import { NextActivityDetails } from './internal/next/details/NextActivityDetails';

export interface PredictActivityDetailsProps {
  item: ActivityListItem;
}

/**
 * The Activity details template for every `prediction*` kind. The legacy
 * branch renders the existing Predict templates unchanged. The next branch
 * renders canonical Trades and Settlements, and Deposits and Withdraws the
 * same way legacy does.
 */
export const PredictActivityDetails = ({
  item,
}: PredictActivityDetailsProps) => (
  <PredictImplementationSwitch
    legacy={<PredictDetails item={item} />}
    next={<NextActivityDetails item={item} />}
    resolving={null}
  />
);
