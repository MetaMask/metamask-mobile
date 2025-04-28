import React, { useMemo } from 'react';
import { TransactionMeta } from '@metamask/transaction-controller';
import BridgeStepDescription, { getStepStatus } from './BridgeStepDescription';
import StepProgressBarItem from './StepProgressBarItem';
import { Box } from '../../../Box/Box';
import { DateTime } from 'luxon';
import { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import { StatusTypes } from '@metamask/bridge-controller';

/**
 * Get the time for a step
 * @param index - The index of the step
 * @param isLastIndex - Whether the step is the last step
 * @param startTime - The start time of the step
 * @param estimatedProcessingTimeInSeconds - The estimated processing time of the step
 */
const getTime = (
  index: number,
  isLastIndex: boolean,
  startTime?: number,
  estimatedProcessingTimeInSeconds?: number,
) => {
  if (index === 0) {
    return startTime;
  }

  return isLastIndex && startTime && estimatedProcessingTimeInSeconds
    ? startTime + estimatedProcessingTimeInSeconds * 1000
    : undefined;
};

interface BridgeStepsProps {
  bridgeHistoryItem?: BridgeHistoryItem;
  srcChainTxMeta?: TransactionMeta;
}

export default function BridgeStepList({
  bridgeHistoryItem,
  srcChainTxMeta,
}: BridgeStepsProps) {
  const steps = useMemo(
    () => bridgeHistoryItem?.quote.steps || [],
    [bridgeHistoryItem],
  );

  const stepStatuses = useMemo(
    () =>
      steps.map((step) =>
        getStepStatus({ bridgeHistoryItem, step, srcChainTxMeta }),
      ),
    [bridgeHistoryItem, srcChainTxMeta, steps],
  );

  return (
    <Box>
      {steps.map((step, i) => {
        const statuses = stepStatuses;
        const prevStepStatus = i > 0 ? statuses[i - 1] : null;
        const stepStatus = statuses[i];
        const nextStepStatus = i < statuses.length - 1 ? statuses[i + 1] : null;

        const isEdgeComplete =
          stepStatus === StatusTypes.COMPLETE &&
          (nextStepStatus === StatusTypes.PENDING ||
            nextStepStatus === StatusTypes.COMPLETE);

        // Making a distinction between displayedStepStatus and stepStatus
        // stepStatus is determined independently of other steps
        // So despite both being technically PENDING,
        // We only want a single spinner animation at a time, so we need to take into account other steps
        const displayedStepStatus =
          prevStepStatus === StatusTypes.PENDING &&
          stepStatus === StatusTypes.PENDING
            ? null
            : stepStatus;

        const time = getTime(
          i,
          i === steps.length - 1,
          bridgeHistoryItem?.startTime || srcChainTxMeta?.time,
          bridgeHistoryItem?.estimatedProcessingTimeInSeconds || 0,
        );
        const formattedTime = time
          ? DateTime.fromMillis(time).toFormat('hh:mm a')
          : '';

        return (
          <StepProgressBarItem
            key={`progress-${step.action}-${step.srcChainId}-${step.destChainId}`}
            stepStatus={displayedStepStatus}
            isLastItem={i === steps.length - 1}
            isEdgeComplete={isEdgeComplete}
          >
            <BridgeStepDescription
              step={step}
              stepStatus={displayedStepStatus}
              time={formattedTime}
            />
          </StepProgressBarItem>
        );
      })}
    </Box>
  );
}
