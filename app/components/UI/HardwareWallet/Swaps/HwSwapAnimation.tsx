import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import Rive, { Alignment, Fit, type RiveRef } from 'rive-react-native';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';

import genericHardwareWalletRiveFile from '../../../../animations/generic_hardware_wallet.riv';
import { HardwareWalletsSwapsSelectorsIDs } from './HardwareWalletsSwaps.testIds';
import {
  type HardwareWalletsSwapsState,
  HardwareWalletsSwapsStatus,
} from './HardwareWalletsSwaps.state';

const HARDWARE_WALLET_RIVE_ARTBOARD = 'Generic';
const HARDWARE_WALLET_RIVE_STATE_MACHINE = 'wallet_states';

const styles = StyleSheet.create({
  riveAnimation: {
    height: 112,
    width: 112,
  },
});

const HardwareWalletRiveTrigger = {
  Reset: 'reset',
  WalletLocked: 'wallet_locked',
  WalletDisconnected: 'wallet_disconnected',
  Error: 'error',
  Found: 'found',
  NotFound: 'not_found',
} as const;

const STATUS_TO_RIVE_TRIGGER: Record<string, string> = {
  [HardwareWalletsSwapsStatus.Submitted]: HardwareWalletRiveTrigger.Found,
  [HardwareWalletsSwapsStatus.Rejected]: HardwareWalletRiveTrigger.Error,
  [HardwareWalletsSwapsStatus.Failed]: HardwareWalletRiveTrigger.Error,
  [HardwareWalletsSwapsStatus.Disconnected]:
    HardwareWalletRiveTrigger.WalletDisconnected,
  [HardwareWalletsSwapsStatus.Cancelled]:
    HardwareWalletRiveTrigger.WalletDisconnected,
  [HardwareWalletsSwapsStatus.Idle]: HardwareWalletRiveTrigger.NotFound,
};

/**
 * Picks the Rive state-machine trigger for a given flow state. Terminal
 * statuses have a 1:1 mapping; non-terminal statuses show the reset state
 * while the user confirms transactions on their device.
 */
function getHardwareWalletRiveTrigger(progress: HardwareWalletsSwapsState) {
  const mapped = STATUS_TO_RIVE_TRIGGER[progress.status];
  if (mapped) return mapped;

  return HardwareWalletRiveTrigger.Reset;
}

export interface HwSwapAnimationProps {
  readonly progress: HardwareWalletsSwapsState;
}

/**
 * Self-contained Rive animation for the HW signing-progress screen. Owns its
 * play state, ref, and the effect that fires the state-machine trigger when
 * `progress` changes. The parent only needs to pass the current flow state.
 */
export function HwSwapAnimation({ progress }: HwSwapAnimationProps) {
  const riveRef = useRef<RiveRef>(null);
  const [isRivePlaying, setIsRivePlaying] = useState(false);

  useEffect(() => {
    if (!isRivePlaying) return;
    const trigger = getHardwareWalletRiveTrigger(progress);
    riveRef.current?.fireState(HARDWARE_WALLET_RIVE_STATE_MACHINE, trigger);
  }, [progress, isRivePlaying]);

  return (
    <Box
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      twClassName="h-32"
    >
      <Rive
        ref={riveRef}
        testID={HardwareWalletsSwapsSelectorsIDs.RIVE_ANIMATION}
        source={genericHardwareWalletRiveFile}
        artboardName={HARDWARE_WALLET_RIVE_ARTBOARD}
        stateMachineName={HARDWARE_WALLET_RIVE_STATE_MACHINE}
        autoplay
        fit={Fit.Contain}
        alignment={Alignment.Center}
        style={styles.riveAnimation}
        onPlay={() => setIsRivePlaying(true)}
      />
    </Box>
  );
}
