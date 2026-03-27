/* eslint-disable @metamask/design-tokens/color-no-hex -- debug-only controls */
/* eslint-disable react-native/no-color-literals -- debug-only controls */
/**
 * DEBUG — only used under `__DEV__` from `MarketInsightsEntryCard`.
 *
 * Remounts `AnimatedGradientBorder` on the real card layout. Wrap the card +
 * replay control in `DevGradientBorderReplayRoot`; keep the border inside the
 * card and render `DevGradientReplayButton` outside (e.g. below `Pressable`).
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  AnimatedGradientBorder,
  type AnimatedGradientBorderProps,
} from './AnimatedGradientBorder';

interface ReplayContextValue {
  replayKey: number;
  bumpReplay: () => void;
}

const DevGradientReplayContext = createContext<ReplayContextValue | null>(null);

function useDevGradientReplay(): ReplayContextValue {
  const ctx = useContext(DevGradientReplayContext);
  if (!ctx) {
    throw new Error(
      'Dev gradient replay: wrap with DevGradientBorderReplayRoot',
    );
  }
  return ctx;
}

const styles = StyleSheet.create({
  replayOuter: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  replay: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#635BFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  replayPressed: {
    opacity: 0.85,
  },
  replayLabel: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  counter: {
    marginTop: 6,
    color: '#8e8e93',
    fontSize: 12,
    textAlign: 'center',
  },
});

/**
 * Provides replay state for `DevReplayAnimatedGradientBorder` and
 * `DevGradientReplayButton`. Place around the card row and the external button.
 */
export const DevGradientBorderReplayRoot: React.FC<PropsWithChildren> = ({
  children,
}) => {
  const [replayKey, setReplayKey] = useState(0);
  const bumpReplay = useCallback(() => setReplayKey((k) => k + 1), []);
  const value = useMemo(
    () => ({ replayKey, bumpReplay }),
    [replayKey, bumpReplay],
  );

  return (
    <DevGradientReplayContext.Provider value={value}>
      {children}
    </DevGradientReplayContext.Provider>
  );
};

/**
 * Same props as `AnimatedGradientBorder`; renders only the SVG (no button).
 */
export const DevReplayAnimatedGradientBorder: React.FC<
  AnimatedGradientBorderProps
> = ({ dimensions, shouldAnimate: viewportShouldAnimate }) => {
  const { replayKey } = useDevGradientReplay();
  const shouldAnimate = viewportShouldAnimate || replayKey > 0;

  return (
    <AnimatedGradientBorder
      key={replayKey}
      dimensions={dimensions}
      shouldAnimate={shouldAnimate}
    />
  );
};

/**
 * Full-width replay control below the card (`paddingHorizontal` matches card `px-4`).
 */
export const DevGradientReplayButton: React.FC = () => {
  const { replayKey, bumpReplay } = useDevGradientReplay();

  return (
    <View style={styles.replayOuter} pointerEvents="box-none">
      <Pressable
        accessibilityLabel="Replay market insights border animation"
        onPress={bumpReplay}
        style={({ pressed }) => [
          styles.replay,
          pressed && styles.replayPressed,
        ]}
      >
        <Text style={styles.replayLabel}>Replay gradient sweep (debug)</Text>
        <Text style={styles.counter}>Replay #{replayKey}</Text>
      </Pressable>
    </View>
  );
};
