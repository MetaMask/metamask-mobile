import React from 'react';
import { TextColor } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import OpenOrderRow from '../../../components/OpenOrderRow';
import type { OrdersTabConfig } from '../../../components/OrdersTabs';
import {
  getRecurringJobOrderCounts,
  MOCK_RECURRING_OPEN_JOB,
  MOCK_RECURRING_OPEN_JOB_SECONDARY,
  MOCK_RECURRING_OPEN_JOB_TERTIARY,
} from '../../RecurringJobDetailsView/RecurringJobDetailsView.mock';
import { RecurringJobDetailsViewSelectorsIDs } from '../../RecurringJobDetailsView/RecurringJobDetailsView.testIds';
import type {
  OnRecurringJobPress,
  RecurringJob,
} from '../../RecurringJobDetailsView/RecurringJobDetailsView.types';

export const MOCK_RECURRING_OPEN_JOBS = [
  MOCK_RECURRING_OPEN_JOB,
  MOCK_RECURRING_OPEN_JOB_SECONDARY,
  MOCK_RECURRING_OPEN_JOB_TERTIARY,
];

function renderRecurringOpenJob(
  job: RecurringJob,
  onJobPress: OnRecurringJobPress,
) {
  const { filledPercent, totalOrderCount } = getRecurringJobOrderCounts(job);

  return (
    <OpenOrderRow
      token={job.destinationToken}
      title={strings('bridge.recurring.pair', {
        source: job.sourceToken.symbol,
        dest: job.destinationToken.symbol,
      })}
      subtitle={strings('bridge.recurring.schedule_summary', {
        interval: job.interval,
        count: totalOrderCount,
      })}
      primaryValue={`+${job.totalReceived}`}
      secondaryValue={strings('bridge.recurring.percent_filled', {
        percent: filledPercent,
      })}
      primaryColor={TextColor.SuccessDefault}
      onPress={() => onJobPress(job.jobId)}
      testID={RecurringJobDetailsViewSelectorsIDs.OPEN_JOB_ROW(job.jobId)}
    />
  );
}

export function createRecurringMockOpenOrdersTab(
  onJobPress: OnRecurringJobPress,
): OrdersTabConfig<RecurringJob> {
  return {
    items: MOCK_RECURRING_OPEN_JOBS,
    renderItem: (job) => renderRecurringOpenJob(job, onJobPress),
    keyExtractor: (job) => job.jobId,
    getItemChainId: (job) => job.destinationToken.chainId,
  };
}
