import React from 'react';
import { Box, BoxFlexDirection } from '@metamask/design-system-react-native';
import { MOCK_KYC_PROGRESS_STEPS } from './constants';
import { MockKycProgressBarSelectorsIDs } from './MockKycProgressBar.testIds';

interface MockKycProgressBarProps {
  /**
   * How many of the four segments should render filled, from the left.
   */
  filledCount: number;
}

/**
 * Demo-only 4-segment bar matching the mock KYC Figma (1 filled on email,
 * 2 filled on success). Not for production KYC.
 */
const MockKycProgressBar = ({ filledCount }: MockKycProgressBarProps) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    accessible={false}
    twClassName="w-full gap-2.5 px-4 pb-3"
    testID={MockKycProgressBarSelectorsIDs.CONTAINER}
  >
    {Array.from({ length: MOCK_KYC_PROGRESS_STEPS }, (_, index) => (
      <Box
        key={index}
        accessible={false}
        twClassName={
          index < filledCount
            ? 'h-1 flex-1 rounded-full bg-icon-default'
            : 'h-1 flex-1 rounded-full bg-icon-muted'
        }
        testID={`${MockKycProgressBarSelectorsIDs.SEGMENT_PREFIX}${index}`}
      />
    ))}
  </Box>
);

export default MockKycProgressBar;
