import React, { useEffect, useRef } from 'react';
import { Text, View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import { PerpsModeTransitionSelectorsIDs } from '../../Perps.testIds';
import { PerpsMode } from '../PerpsModeToggle';
import styleSheet from './PerpsModeTransition.styles';
import type { PerpsModeTransitionProps } from './PerpsModeTransition.types';

const DEFAULT_DURATION_MS = 1500;

/**
 * Full-screen interstitial shown briefly while switching between Lite and Pro
 * mode (TAT-3551). Displays the destination mode name in the Perps accent
 * palette, then invokes `onDone` so the caller can navigate to the destination
 * Perps screen.
 */
const PerpsModeTransition: React.FC<PerpsModeTransitionProps> = ({
  mode,
  durationMs = DEFAULT_DURATION_MS,
  onDone,
  testID = PerpsModeTransitionSelectorsIDs.CONTAINER,
}) => {
  const { styles } = useStyles(styleSheet, {});

  // Keep the latest onDone in a ref so the auto-dismiss timer depends only on
  // `durationMs`. Otherwise a change in `onDone` identity (e.g. when the
  // navigation object re-renders under the Perps stream/connection providers)
  // would tear down and restart the timer, potentially resetting it forever
  // and leaving the interstitial stuck on screen.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const timer = setTimeout(() => onDoneRef.current?.(), durationMs);
    return () => clearTimeout(timer);
  }, [durationMs]);

  const title =
    mode === PerpsMode.Pro
      ? strings('perps.mode.pro_transition_title')
      : strings('perps.mode.lite_transition_title');

  return (
    <View style={styles.container} testID={testID}>
      <Text
        style={styles.title}
        testID={PerpsModeTransitionSelectorsIDs.TITLE}
        allowFontScaling={false}
      >
        {title}
      </Text>
    </View>
  );
};

export default PerpsModeTransition;
