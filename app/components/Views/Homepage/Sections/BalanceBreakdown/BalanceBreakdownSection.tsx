import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import HomepageBalanceBreakdown from '../../components/HomepageBalanceBreakdown';
import type { HomepageBalanceBreakdownProps } from '../../components/HomepageBalanceBreakdown/HomepageBalanceBreakdown';

export const BALANCE_BREAKDOWN_SECTION_TEST_ID =
  'homepage-balance-breakdown-section';

export type BalanceBreakdownSectionProps = HomepageBalanceBreakdownProps;

const BalanceBreakdownSection = (props: BalanceBreakdownSectionProps) => (
  <Box paddingBottom={1} testID={BALANCE_BREAKDOWN_SECTION_TEST_ID}>
    <HomepageBalanceBreakdown {...props} />
  </Box>
);

export default BalanceBreakdownSection;
