import React, { useCallback } from 'react';
import { NetworkConfiguration } from '@metamask/network-controller';
import { TransactionMeta } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import BridgeStepDescription, {
  getStepStatus,
} from './BridgeStepDescription';
import StepProgressBarItem from './StepProgressBarItem';
import { Box } from '../../../Box/Box';
import { DateTime } from 'luxon';
import { BridgeHistoryItem, StatusTypes } from '@metamask/bridge-status-controller';
import { Step } from '@metamask/bridge-controller';

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
  networkConfigurationsByChainId: Record<Hex, NetworkConfiguration>;
}

export default function BridgeStepList({
  bridgeHistoryItem,
  srcChainTxMeta,
  networkConfigurationsByChainId,
}: BridgeStepsProps) {
  const steps = bridgeHistoryItem?.quote.steps || [];

  const stepStatuses = useCallback(() => {
    return steps.map((step) =>
      getStepStatus({ bridgeHistoryItem, step: step as Step, srcChainTxMeta }),
    );
  }, [bridgeHistoryItem, srcChainTxMeta, steps]);

  return (
    <Box>
      {steps.map((step, i) => {
        const statuses = stepStatuses();
        const prevStepStatus = i > 0 ? statuses[i - 1] : null;
        const stepStatus = statuses[i];
        const nextStepStatus =
          i < statuses.length - 1 ? statuses[i + 1] : null;

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
        const formattedTime = time ? DateTime.fromMillis(time).toFormat('hh:mm a') : '';

        return (
          <StepProgressBarItem
            key={`progress-${step.action}-${step.srcChainId}-${step.destChainId}`}
            stepStatus={displayedStepStatus}
            isLastItem={i === steps.length - 1}
            isEdgeComplete={isEdgeComplete}
          >
            <BridgeStepDescription
              step={step}
              networkConfigurationsByChainId={networkConfigurationsByChainId}
              stepStatus={displayedStepStatus}
              time={formattedTime}
            />
          </StepProgressBarItem>
        );
      })}
    </Box>
  );
}
