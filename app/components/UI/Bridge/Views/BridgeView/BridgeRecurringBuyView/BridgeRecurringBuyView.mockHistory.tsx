import React from 'react';
import {
  Tag,
  TagSeverity,
  TextColor,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import OpenOrderRow from '../../../components/OpenOrderRow';
import type { OrdersTabConfig } from '../../../components/OrdersTabs';
import {
  getRecurringJobOrderCounts,
  MOCK_RECURRING_COMPLETED_JOB,
} from '../../RecurringJobDetailsView/RecurringJobDetailsView.mock';
import { RecurringJobDetailsViewSelectorsIDs } from '../../RecurringJobDetailsView/RecurringJobDetailsView.testIds';
import type {
  OnRecurringJobPress,
  RecurringJob,
} from '../../RecurringJobDetailsView/RecurringJobDetailsView.types';

export const MOCK_RECURRING_HISTORY_JOBS = [MOCK_RECURRING_COMPLETED_JOB];

function renderRecurringHistoryJob(
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
      titleEndAccessory={
        <Tag severity={TagSeverity.Neutral}>
          {strings('bridge.recurring.completed')}
        </Tag>
      }
      onPress={() => onJobPress(job.jobId)}
      testID={RecurringJobDetailsViewSelectorsIDs.COMPLETED_JOB_ROW}
    />
  );
}

export function createRecurringMockHistoryTab(
  onJobPress: OnRecurringJobPress,
): OrdersTabConfig<RecurringJob> {
  return {
    items: MOCK_RECURRING_HISTORY_JOBS,
    renderItem: (job) => renderRecurringHistoryJob(job, onJobPress),
    keyExtractor: (job) => job.jobId,
    getItemChainId: (job) => job.destinationToken.chainId,
  };
}
