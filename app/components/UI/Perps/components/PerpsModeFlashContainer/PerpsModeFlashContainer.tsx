import MaskedView from '@react-native-masked-view/masked-view';
import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { PerpsMode } from '@metamask/perps-controller';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import {
  hidePerpsModeFlash,
  usePerpsModeFlash,
} from '../../utils/perpsModeFlash';
import { PerpsModeFlashSelectorsIDs } from '../../Perps.testIds';
import styleSheet, {
  PERPS_MODE_FLASH_PRO_GRADIENT,
} from './PerpsModeFlashContainer.styles';
import type { PerpsModeFlashContainerProps } from './PerpsModeFlashContainer.types';

const DEFAULT_DURATION_MS = 1200;

// Spring mirrors the QuickBuy Buy/Sell toggle feel (TAT-3551): a snappy,
// lightly-damped entrance for the mode title.
const TITLE_SPRING_CONFIG = {
  duration: 300,
  dampingRatio: 0.7,
} as const;

/**
 * Global Perps Lite ⇄ Pro mode-switch flash (TAT-3551).
 *
 * Rendered once at the root of the Perps stack. It subscribes to the transient
 * `perpsModeFlash` store; whenever a mode is set (by any entry point that
 * toggles Lite/Pro) it briefly flashes the destination mode name on top of the
 * current Perps screen — mimicking the QuickBuy Buy/Sell transition feel — then
 * clears the state so the flash disappears. Navigation to the destination
 * screen is handled by the caller, so this component is purely presentational.
 */
const PerpsModeFlashContainer: React.FC<PerpsModeFlashContainerProps> = ({
  durationMs = DEFAULT_DURATION_MS,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const mode = usePerpsModeFlash();

  const titleProgress = useSharedValue(0);
  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleProgress.value,
    transform: [
      { scale: 0.85 + titleProgress.value * 0.15 },
      { translateY: (1 - titleProgress.value) * 12 },
    ],
  }));

  // Auto-dismiss after the flash has been shown for `durationMs`. Restarting
  // the timer whenever `mode` changes keeps the flash duration consistent even
  // if the user toggles again mid-flash.
  useEffect(() => {
    if (!mode) {
      return undefined;
    }
    titleProgress.value = 0;
    titleProgress.value = withSpring(1, TITLE_SPRING_CONFIG);
    const timer = setTimeout(() => {
      hidePerpsModeFlash();
    }, durationMs);
    return () => clearTimeout(timer);
  }, [mode, durationMs, titleProgress]);

  // Clear any lingering flash when leaving the Perps stack so it never replays
  // on re-entry.
  useEffect(() => () => hidePerpsModeFlash(), []);

  if (!mode) {
    return null;
  }

  const isPro = mode === PerpsMode.Pro;
  const title = isPro
    ? strings('perps.mode.pro_transition_title')
    : strings('perps.mode.lite_transition_title');

  return (
    <Animated.View
      style={styles.container}
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(180)}
      pointerEvents="none"
      testID={PerpsModeFlashSelectorsIDs.CONTAINER}
    >
      <Animated.View style={titleAnimatedStyle}>
        {isPro ? (
          <MaskedView
            maskElement={
              <Text
                style={styles.title}
                testID={PerpsModeFlashSelectorsIDs.TITLE}
              >
                {title}
              </Text>
            }
          >
            <LinearGradient
              colors={PERPS_MODE_FLASH_PRO_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientFill}
            >
              <Text style={[styles.title, styles.gradientTextMask]}>
                {title}
              </Text>
            </LinearGradient>
          </MaskedView>
        ) : (
          <View>
            <Text
              style={styles.title}
              testID={PerpsModeFlashSelectorsIDs.TITLE}
            >
              {title}
            </Text>
          </View>
        )}
      </Animated.View>
    </Animated.View>
  );
};

export default PerpsModeFlashContainer;
