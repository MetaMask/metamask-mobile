import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import {
  AvatarIcon,
  AvatarIconSeverity,
  AvatarIconSize,
  Box,
  IconName,
} from '@metamask/design-system-react-native';
import { useIsFocused } from '@react-navigation/native';
import {
  Alignment,
  Fit,
  RiveErrorType,
  RiveView,
  useRive,
  useRiveFile,
  type RiveError,
} from '@rive-app/react-native';
import Logger from '../../../../../util/Logger';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { MoneyMfaTestIds } from './MoneyMfa.testIds';
import moneyTwoFactorAnimation from '../../../../../animations/money_2fa_v2.riv';

const STATE_MACHINE_NAME = 'State Machine 1';

// Lets a screen opened on top (e.g. Money onboarding) cover Money first, so the animation isn't played unseen.
export const SHIELD_PLAY_DELAY_MS = 600;

const styles = StyleSheet.create({
  hidden: { opacity: 0 },
  fallback: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

interface MoneyMfaShieldAnimationProps {
  size: number;
}

const MoneyMfaShieldAnimation = ({ size }: MoneyMfaShieldAnimationProps) => {
  const reduceMotion = useReduceMotion();
  const [hasRiveError, setHasRiveError] = useState(false);
  const { riveFile } = useRiveFile(moneyTwoFactorAnimation);
  const { riveViewRef, setHybridRef } = useRive();

  const animate = !reduceMotion && !hasRiveError;
  const isRiveReady = animate && Boolean(riveFile) && Boolean(riveViewRef);

  const logError = useCallback((error: Error, data: Record<string, string>) => {
    Logger.error(error, {
      tags: { feature: 'money-home' },
      context: { name: 'MoneyMfaShieldAnimation', data },
    });
  }, []);

  const handleError = useCallback(
    (riveError: RiveError) => {
      logError(new Error(riveError.message), {
        errorType: RiveErrorType[riveError.type],
      });
      setHasRiveError(true);
    },
    [logError],
  );

  const isFocused = useIsFocused();

  useEffect(() => {
    if (!isFocused || !isRiveReady || !riveViewRef) return undefined;
    const timer = setTimeout(() => {
      const play = async () => {
        await riveViewRef.reset();
        await riveViewRef.play();
      };
      play().catch((error: unknown) =>
        logError(error instanceof Error ? error : new Error(String(error)), {
          action: 'play',
        }),
      );
    }, SHIELD_PLAY_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isFocused, isRiveReady, riveViewRef, logError]);

  const dimensions = { width: size, height: size };

  return (
    <Box style={dimensions} accessible={false}>
      {!isRiveReady && (
        <Box style={styles.fallback} testID={MoneyMfaTestIds.SHIELD_FALLBACK}>
          <AvatarIcon
            iconName={IconName.SecurityTick}
            severity={AvatarIconSeverity.Success}
            size={AvatarIconSize.Lg}
          />
        </Box>
      )}
      {animate && riveFile && (
        <RiveView
          hybridRef={setHybridRef}
          file={riveFile}
          stateMachineName={STATE_MACHINE_NAME}
          autoPlay={false}
          fit={Fit.Contain}
          alignment={Alignment.Center}
          style={[dimensions, !isRiveReady && styles.hidden]}
          onError={handleError}
          testID={MoneyMfaTestIds.SHIELD_ANIMATION}
        />
      )}
    </Box>
  );
};

export default MoneyMfaShieldAnimation;
