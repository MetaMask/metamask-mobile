import React from 'react';
import { Box } from '@metamask/design-system-react-native';

export interface SegmentedProgressBarProps {
  /**
   * 1-based count of completed steps used to compute the filled segments.
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

enum SegmentState {
  Completed = 'completed',
  Upcoming = 'upcoming',
}

const Segment = ({ state }: { state: SegmentState }) => (
  <Box
    twClassName={`flex-1 h-1 rounded-lg ${state === SegmentState.Completed ? 'bg-success-default' : 'bg-muted-hover'}`}
  />
);

const SegmentedProgressBar = ({
  current,
  total,
  testID,
}: SegmentedProgressBarProps) => (
  <Box twClassName="flex-row gap-1" testID={testID}>
    {Array.from({ length: total }, (_, index) => (
      <Segment
        key={index}
        state={index < current ? SegmentState.Completed : SegmentState.Upcoming}
      />
    ))}
  </Box>
);

export default SegmentedProgressBar;
