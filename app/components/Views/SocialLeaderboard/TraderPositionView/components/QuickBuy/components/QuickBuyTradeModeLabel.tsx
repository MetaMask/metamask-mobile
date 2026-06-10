import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { AnimationDuration } from '@metamask/design-tokens';
import {
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';

/** Cross-fade duration — old and new overlap, so a single short leg is enough. */
const FADE_DURATION = AnimationDuration.Quickly;

const styles = StyleSheet.create({
  container: { position: 'relative' },
  // The outgoing word is layered on top of the incoming one so the two
  // dissolve into each other without shifting layout or blanking out.
  overlay: { position: 'absolute', left: 0, top: 0 },
});

interface QuickBuyTradeModeLabelProps {
  /** The label to show (e.g. "Pay with" / "Receive"). */
  label: string;
  testID?: string;
}

const LabelText: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
    {children}
  </Text>
);

/**
 * Cross-fades the "Pay with" / "Receive" label when the trade mode flips. The
 * incoming word fades in while the outgoing word fades out at the same time
 * (no blank trough), so the swap reads as a smooth dissolve.
 */
const QuickBuyTradeModeLabel: React.FC<QuickBuyTradeModeLabelProps> = ({
  label,
  testID,
}) => {
  const [currentLabel, setCurrentLabel] = useState(label);
  const [previousLabel, setPreviousLabel] = useState<string | null>(null);
  // 1 = incoming fully shown, 0 = incoming hidden (outgoing fully shown).
  const progress = useSharedValue(1);
  const cleanupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (label === currentLabel) return;

    // Restart cleanly if a previous fade is still in flight. We deliberately
    // do NOT clear this timer in an effect cleanup: `setCurrentLabel` below
    // re-runs this effect, which would otherwise cancel the timer we just set.
    if (cleanupTimer.current) clearTimeout(cleanupTimer.current);

    setPreviousLabel(currentLabel);
    setCurrentLabel(label);
    progress.value = 0;
    progress.value = withTiming(1, { duration: FADE_DURATION });

    // Drop the outgoing layer once it has faded out.
    cleanupTimer.current = setTimeout(
      () => setPreviousLabel(null),
      FADE_DURATION,
    );
  }, [label, currentLabel, progress]);

  // Cancel any in-flight cleanup on unmount only.
  useEffect(
    () => () => {
      if (cleanupTimer.current) clearTimeout(cleanupTimer.current);
    },
    [],
  );

  const incomingStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const outgoingStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
  }));

  return (
    <Animated.View style={styles.container} testID={testID}>
      <Animated.View style={incomingStyle}>
        <LabelText>{currentLabel}</LabelText>
      </Animated.View>
      {previousLabel !== null && (
        <Animated.View
          style={[styles.overlay, outgoingStyle]}
          pointerEvents="none"
        >
          <LabelText>{previousLabel}</LabelText>
        </Animated.View>
      )}
    </Animated.View>
  );
};

export default QuickBuyTradeModeLabel;
