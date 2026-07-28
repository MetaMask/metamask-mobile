import {
  Box,
  IconColor,
  IconSize,
  Spinner,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';

import { AgentProgressTestIds } from './AgentProgress.testIds';

export enum AgentProgressStatus {
  Thinking = 'thinking',
  SearchingWeb = 'searching-web',
  CheckingPrices = 'checking-prices',
  PreparingPlan = 'preparing-plan',
  PreparingQuote = 'preparing-quote',
}

export interface AgentProgressProps {
  status: AgentProgressStatus;
  /**
   * Overrides the default status copy while retaining the same visual and
   * accessible treatment.
   */
  label?: string;
  testID?: string;
}

export const AGENT_PROGRESS_LABELS: Record<AgentProgressStatus, string> = {
  [AgentProgressStatus.Thinking]: 'Thinking',
  [AgentProgressStatus.SearchingWeb]: 'Searching the web',
  [AgentProgressStatus.CheckingPrices]: 'Checking prices',
  [AgentProgressStatus.PreparingPlan]: 'Preparing transaction plan',
  [AgentProgressStatus.PreparingQuote]: 'Preparing quote',
};

const AgentProgress = ({
  status,
  label,
  testID = AgentProgressTestIds.CONTAINER,
}: AgentProgressProps) => {
  const statusLabel = label ?? AGENT_PROGRESS_LABELS[status];

  return (
    <Box
      accessible
      accessibilityLabel={statusLabel}
      accessibilityLiveRegion="polite"
      accessibilityRole="progressbar"
      testID={testID}
      twClassName="flex-row items-center gap-2 py-1"
    >
      <Spinner
        color={IconColor.IconAlternative}
        spinnerIconProps={{ size: IconSize.Sm }}
        testID={AgentProgressTestIds.SPINNER}
      />
      <Text
        color={TextColor.TextAlternative}
        variant={TextVariant.BodySm}
        testID={AgentProgressTestIds.LABEL}
      >
        {statusLabel}
      </Text>
    </Box>
  );
};

export default AgentProgress;
