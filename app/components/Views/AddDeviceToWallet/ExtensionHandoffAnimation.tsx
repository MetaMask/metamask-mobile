import React, { useCallback, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import {
  Alignment,
  Fit,
  type RiveError,
  RiveView,
  useRive,
  useRiveFile,
} from '@rive-app/react-native';
import { Box } from '@metamask/design-system-react-native';
import LoadingMetaMaskFoxRive from '../../../animations/loading_mm_fox.riv';
import { strings } from '../../../../locales/i18n';
import Logger from '../../../util/Logger';

const styles = StyleSheet.create({
  animation: {
    width: 144,
    height: 144,
  },
});

const ExtensionHandoffAnimation = () => {
  const { riveFile, error: riveFileError } = useRiveFile(
    LoadingMetaMaskFoxRive,
  );
  const { riveViewRef, setHybridRef } = useRive();

  useEffect(() => {
    if (
      !riveViewRef ||
      typeof riveViewRef.awaitViewReady !== 'function' ||
      typeof riveViewRef.play !== 'function'
    ) {
      return;
    }

    let isMounted = true;
    void riveViewRef
      .awaitViewReady()
      .then((isReady) => {
        if (isMounted && isReady) {
          return riveViewRef.play();
        }
        return undefined;
      })
      .catch((error: Error) => {
        Logger.error(
          error,
          'ExtensionHandoffAnimation: Failed to start Rive playback',
        );
      });

    return () => {
      isMounted = false;
    };
  }, [riveViewRef]);

  useEffect(() => {
    if (riveFileError) {
      Logger.error(
        riveFileError,
        'ExtensionHandoffAnimation: Failed to load Rive file',
      );
    }
  }, [riveFileError]);

  const handleRiveError = useCallback((error: RiveError) => {
    Logger.error(
      new Error(error.message),
      `ExtensionHandoffAnimation: Rive error (${error.type})`,
    );
  }, []);

  return (
    <Box
      twClassName="h-48 w-full items-center justify-center"
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={strings(
        'app_settings.add_device.waiting_for_extension_description',
      )}
      testID="extension-handoff-animation"
    >
      {riveFile ? (
        <RiveView
          hybridRef={setHybridRef}
          file={riveFile}
          artboardName="Loading"
          stateMachineName="State Machine 1"
          autoPlay
          fit={Fit.Contain}
          alignment={Alignment.Center}
          style={styles.animation}
          onError={handleRiveError}
          testID="extension-handoff-fox"
        />
      ) : null}
    </Box>
  );
};

export default ExtensionHandoffAnimation;
