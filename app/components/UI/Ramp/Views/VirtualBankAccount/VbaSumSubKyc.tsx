import React from 'react';
import { ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useLaunchSumSub } from './hooks/useLaunchSumSub';

export const VbaSumSubKycSelectorsIDs = {
  CONTAINER: 'vba-sumsub-kyc-container',
} as const;

/**
 * Host screen for the `KycRequired` stage. It opens the SumSub SDK on mount
 * (via {@link useLaunchSumSub}) and routes onward from the KYC outcome, so it
 * renders only a spinner — the SDK presents itself over this screen. Provider
 * terms are accepted earlier, on the Verify Identity screen.
 */
const VbaSumSubKyc = () => {
  const tw = useTailwind();
  useLaunchSumSub();

  return (
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
      testID={VbaSumSubKycSelectorsIDs.CONTAINER}
    >
      <Box
        twClassName="flex-1"
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
      >
        <ActivityIndicator />
      </Box>
    </SafeAreaView>
  );
};

export default VbaSumSubKyc;
