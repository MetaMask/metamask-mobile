import React from 'react';
import { Box } from '@metamask/design-system-react-native';

interface MoneyProgressBarProps {
  /**
   * 1-based count of completed steps used to compute the filled portion.
   */
  current: number;
  /**
   * Total number of steps. Guarded against non-positive values to avoid
   * divide-by-zero when the caller hasn't wired this yet.
   */
  total: number;
  /**
   * Optional testID forwarded to the outer track.
   */
  testID?: string;
}

const MoneyProgressBar = ({
  current,
  total,
  testID,
}: MoneyProgressBarProps) => {
  const safeTotal = Math.max(1, total);
  const percent = Math.min(100, Math.max(0, (current / safeTotal) * 100));

  return (
    <Box
      twClassName="h-2 w-full rounded-full bg-success-muted overflow-hidden"
      testID={testID}
    >
      <Box
        twClassName="h-full bg-success-default"
        style={{ width: `${percent}%` }}
      />
    </Box>
  );
};

export default MoneyProgressBar;
