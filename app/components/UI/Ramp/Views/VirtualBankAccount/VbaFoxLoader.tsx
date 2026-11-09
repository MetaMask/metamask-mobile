import React, { useCallback, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import {
  Alignment,
  Fit,
  RiveView,
  useRiveFile,
  type RiveError,
} from '@rive-app/react-native';
import { Box } from '@metamask/design-system-react-native';
import {
  useNetworkTier,
  type NetworkTier,
} from '../../../../../hooks/useNetworkTier';
import { strings } from '../../../../../../locales/i18n';
import Logger from '../../../../../util/Logger';
import {
  getHardwareTier,
  type HardwareTier,
} from '../../../../../util/deviceCapability';
import { hasTestOverrides } from '../../../../../util/test/utils';
import { useReduceMotion } from '../../../Money/hooks/useReduceMotion';
import loadingMmFox from '../../../../../animations/loading_mm_fox.riv';

/** Runtime names found in the `loading_mm_fox.riv` export. */
const RIVE_ARTBOARD_NAME = 'Loading';
const RIVE_STATE_MACHINE_NAME = 'State Machine 1';

const FOX_SIZE = { width: 160, height: 160 };

export const VbaFoxLoaderSelectorsIDs = {
  ANIMATION: 'vba-fox-loader-animation',
  FALLBACK: 'vba-fox-loader-fallback',
} as const;

/** Fox plays unless Reduce Motion is on, the network is `NONE`, or a `LOW` device is on slow cellular. */
export const shouldPlayVbaFoxLoader = ({
  hardwareTier,
  networkTier,
  reduceMotion,
}: {
  hardwareTier: HardwareTier | null;
  networkTier: NetworkTier | null;
  reduceMotion: boolean;
}): boolean => {
  if (reduceMotion || networkTier === 'NONE') {
    return false;
  }

  return !(hardwareTier === 'LOW' && networkTier === 'SLOW_CELLULAR');
};

interface VbaFoxLoaderProps {
  testID?: string;
}

/**
 * Centered fox that replaces a full-screen activity indicator in VBA waits.
 * Falls back to the indicator when the animation cannot play.
 */
const VbaFoxLoader = ({ testID }: VbaFoxLoaderProps) => {
  const hardwareTier = getHardwareTier();
  const networkTier = useNetworkTier();
  const reduceMotion = useReduceMotion();
  const { riveFile, error: riveFileError } = useRiveFile(loadingMmFox);
  const [hasViewError, setHasViewError] = useState(false);

  const handleError = useCallback((riveError: RiveError) => {
    Logger.error(
      new Error(riveError.message),
      `VbaFoxLoader: Rive error (${riveError.type})`,
    );
    setHasViewError(true);
  }, []);

  const playFox =
    !hasTestOverrides &&
    !hasViewError &&
    !riveFileError &&
    Boolean(riveFile) &&
    shouldPlayVbaFoxLoader({ hardwareTier, networkTier, reduceMotion });

  return (
    <Box
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={strings(
        'virtual_bank_account.loading_accessibility_label',
      )}
    >
      {playFox && riveFile ? (
        <RiveView
          file={riveFile}
          artboardName={RIVE_ARTBOARD_NAME}
          stateMachineName={RIVE_STATE_MACHINE_NAME}
          autoPlay
          fit={Fit.Contain}
          alignment={Alignment.Center}
          style={FOX_SIZE}
          onError={handleError}
          accessible={false}
          testID={VbaFoxLoaderSelectorsIDs.ANIMATION}
        />
      ) : (
        <ActivityIndicator
          accessible={false}
          testID={VbaFoxLoaderSelectorsIDs.FALLBACK}
        />
      )}
    </Box>
  );
};

export default VbaFoxLoader;
