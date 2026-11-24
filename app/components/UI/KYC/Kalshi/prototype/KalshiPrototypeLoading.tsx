// PROTOTYPE-DO-NOT-MERGE
// Paper screens: KP-02 (see prototypeScreens.ts)
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import VbaFoxLoader from '../../../Ramp/Views/VirtualBankAccount/VbaFoxLoader';

export const KalshiPrototypeLoadingSelectorsIDs = {
  CONTAINER: 'kalshi-prototype-loading',
  LOADER: 'kalshi-prototype-loading-fox',
} as const;

/**
 * Every loading state in the prototype: the shared fox loader the VBA flow
 * uses, with no text or content of its own. It holds until the caller swaps
 * in what it was waiting for, exactly like `VbaOnboardingLoading` and
 * `KycSumSub` hold theirs.
 *
 * @returns The screen.
 */
const KalshiPrototypeLoading = () => {
  const tw = useTailwind();

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default')}
      testID={KalshiPrototypeLoadingSelectorsIDs.CONTAINER}
    >
      <Box
        twClassName="flex-1"
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
      >
        <VbaFoxLoader testID={KalshiPrototypeLoadingSelectorsIDs.LOADER} />
      </Box>
    </SafeAreaView>
  );
};

export default KalshiPrototypeLoading;
