import React from 'react';
import { strings } from '../../../../../locales/i18n';
import { getIntlDateTimeFormatter } from '../../../../util/intl';
import {
  getPerpsCompletedStepCount,
  getPerpsStepLabels,
  type PerpsDepositWithdrawalStatus,
} from './ActivityDetailsPerps.utils';
import {
  ActivityDetailsStepTimeline,
  type ActivityDetailsStep,
  type ActivityDetailsStepExplorerTarget,
} from './ActivityDetailsStepTimeline';

function formatStepTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const time = getIntlDateTimeFormatter('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
  const day = getIntlDateTimeFormatter('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);

  return `${time} - ${day}`;
}

function getStepSummary({
  completedCount,
  status,
  totalSteps,
}: {
  completedCount: number;
  status: PerpsDepositWithdrawalStatus;
  totalSteps: number;
}) {
  if (status === 'completed') {
    return strings('perps.transactions.steps.title_completed', {
      completed: totalSteps,
    });
  }

  if (status === 'failed') {
    return strings('perps.transactions.steps.title_failed', {
      completed: completedCount,
      failed: totalSteps - completedCount,
    });
  }

  return strings('perps.transactions.steps.title_pending', {
    completed: completedCount,
    pending: totalSteps - completedCount,
  });
}

export function ActivityDetailsPerpsStepTimeline({
  explorerTarget,
  status,
  timestamp,
  type,
}: {
  explorerTarget?: ActivityDetailsStepExplorerTarget;
  status: PerpsDepositWithdrawalStatus;
  timestamp: number;
  type: 'deposit' | 'withdrawal';
}) {
  const labels = getPerpsStepLabels(type);
  const completedCount = getPerpsCompletedStepCount({
    status,
    totalSteps: labels.length,
  });
  const steps: ActivityDetailsStep[] = labels.map((label, index) => {
    const isFailed = status === 'failed' && index === completedCount;
    const isPending =
      status !== 'completed' && status !== 'failed' && index === completedCount;
    const isComplete = index < completedCount && !isFailed;
    const subtext = isFailed
      ? strings('transaction.failed')
      : isPending
        ? strings('transaction.pending')
        : isComplete
          ? formatStepTimestamp(timestamp)
          : undefined;

    return {
      label,
      subtext,
      status: isFailed
        ? 'failed'
        : isPending
          ? 'pending'
          : isComplete
            ? 'completed'
            : 'upcoming',
    };
  });

  return (
    <ActivityDetailsStepTimeline
      explorerTarget={explorerTarget}
      steps={steps}
      title={getStepSummary({
        completedCount: Math.min(completedCount, labels.length),
        status,
        totalSteps: labels.length,
      })}
    />
  );
}
