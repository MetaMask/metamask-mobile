import React from 'react';
import { Box } from '@metamask/design-system-react-native';

/**
 * Shared primitives for the Activity-redesign step timeline: a small
 * status-coloured dot per step, joined by a vertical dotted line.
 *
 * Consumed by `ActivityDetailsStepTimeline` (Activity redesign) and the
 * confirmations `ProgressListItem` dot variant (Money account transaction
 * details) so the two surfaces cannot drift apart visually.
 */

export type StepDotStatus = 'success' | 'error' | 'warning' | 'muted';

const DOT_CLASS_BY_STATUS: Record<StepDotStatus, string> = {
  success: 'bg-success-default',
  error: 'bg-error-default',
  warning: 'bg-warning-default',
  muted: 'bg-muted',
};

export function StepDot({
  status,
  testID,
}: {
  status: StepDotStatus;
  testID?: string;
}) {
  return (
    <Box
      testID={testID}
      twClassName={`w-2 h-2 rounded-full ${DOT_CLASS_BY_STATUS[status]}`}
    />
  );
}

const CONNECTOR_DOT_COUNT = 6;

/**
 * Vertical dotted line drawn below a `StepDot`, sized to span one step row
 * (title + subtitle). The slight negative top margin tucks it under the dot
 * so the clearance to the dots above and below reads evenly.
 */
export function StepConnector({ testID }: { testID?: string }) {
  return (
    <Box testID={testID} twClassName="items-center -mt-0.5 gap-0.5">
      {Array.from({ length: CONNECTOR_DOT_COUNT }).map((_, index) => (
        <Box key={index} twClassName="w-1 h-1 rounded-full bg-border-muted" />
      ))}
    </Box>
  );
}
