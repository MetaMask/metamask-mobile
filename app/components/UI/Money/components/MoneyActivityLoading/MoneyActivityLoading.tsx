import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Spinner,
  IconSize,
} from '@metamask/design-system-react-native';
import { MoneyActivityLoadingTestIds } from './MoneyActivityLoading.testIds';

/**
 * Centered spinner shown in place of the activity list while card payments load
 * for the first time. Prevents the "flash" of on-chain-only rows (which are in
 * Redux synchronously) before the async Accounts-API card rows arrive.
 */
const MoneyActivityLoading = () => (
  <Box
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Center}
    twClassName="py-3"
    testID={MoneyActivityLoadingTestIds.CONTAINER}
  >
    <Spinner spinnerIconProps={{ size: IconSize.Lg }} />
  </Box>
);

export default MoneyActivityLoading;
