// DEMO-ONLY: navigation performance overlay utilities.
// Used to compare JS-stack vs native-stack transition performance.
// Remove imports/usages before merging to main.

import { useCallback, useEffect, useReducer, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

export interface NavPerfSample {
  label: string;
  ms: number;
  at: number;
}

/** Canonical labels for native-stack demo flows (MainNavigator only). */
export const NavPerfLabel = {
  SettingsMenu: 'SettingsMenu',
  SettingsMenuBack: 'SettingsMenu (back)',
  SettingsScreen: 'Settings',
  SettingsScreenBack: 'Settings (back)',
  BridgeView: 'BridgeView',
  BridgeViewBack: 'BridgeView (back)',
  BridgeTokenSelector: 'Bridge.TokenSelector',
  SendAmount: 'Send.Amount',
  AssetView: 'Asset',
  AssetViewBack: 'Asset (back)',
} as const;

const starts = new Map<string, number>();
let samples: NavPerfSample[] = [];
const listeners = new Set<() => void>();

const MAX_SAMPLES = 10;

function notify() {
  listeners.forEach((l) => l());
}

/**
 * Record the start of a navigation transition. Call immediately before
 * `navigation.navigate(...)` or `navigation.goBack()`.
 */
export function markNavStart(label: string): void {
  starts.set(label, Date.now());
}

/**
 * Records the end of a navigation transition when the screen comes into focus.
 */
export function useMarkNavEnd(label: string): void {
  const onFocus = useCallback(() => {
    const start = starts.get(label);
    if (start == null) {
      return;
    }
    starts.delete(label);
    const ms = Date.now() - start;
    samples = [{ label, ms, at: Date.now() }, ...samples].slice(0, MAX_SAMPLES);
    notify();
  }, [label]);

  useFocusEffect(onFocus);
}

/** Subscribe to the latest navigation samples for the overlay. */
export function useNavPerfSamples(): NavPerfSample[] {
  const [, force] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    listeners.add(force);
    return () => {
      listeners.delete(force);
    };
  }, []);
  return samples;
}

export function clearNavPerfSamples(): void {
  starts.clear();
  samples = [];
  notify();
}

/**
 * JS-thread frame rate sampled via requestAnimationFrame. Drops when the JS
 * thread is busy driving stack transitions; native-stack animations stay closer
 * to display refresh because they run on the UI thread.
 */
export function useJsFps(): number {
  const [fps, setFps] = useState(0);
  useEffect(() => {
    let frames = 0;
    let last = Date.now();
    let raf: number;
    const tick = () => {
      frames++;
      const now = Date.now();
      const elapsed = now - last;
      if (elapsed >= 500) {
        setFps(Math.round((frames * 1000) / elapsed));
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return fps;
}
