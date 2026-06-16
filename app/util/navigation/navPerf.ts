// DEMO-ONLY: navigation performance overlay utilities.
// Used to compare JS-stack vs native-stack transition performance.
// Remove imports/usages before merging to main.
//
// What this measures and why:
// Native-stack runs the transition animation on the UI/native thread, so the
// JS thread stays free during the push/pop. JS-stack drives the animation with
// a per-frame cardStyleInterpolator on the JS thread, so the JS thread janks
// while it is also mounting the destination screen. Total "time-to-focus" is a
// poor proxy for this (both stacks mount the same screen and use a fixed ~300ms
// animation). Instead we run a requestAnimationFrame monitor across the whole
// transition window and count *dropped frames* + worst frame time on the JS
// thread. More dropped frames == more jank == worse perceived smoothness.

import { useCallback, useEffect, useReducer, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

export interface NavPerfSample {
  label: string;
  /** tap -> screen focus (mount) time in ms, if focus fired in-window */
  ms?: number;
  /** dropped frames on the JS thread during the transition window */
  dropped: number;
  /** longest single frame interval in ms (worst stall) */
  worstMs: number;
  /** effective JS-thread FPS over the capture window */
  fps: number;
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

let samples: NavPerfSample[] = [];
const listeners = new Set<() => void>();

const MAX_SAMPLES = 10;
// 60Hz frame budget. Intervals longer than this dropped frame(s).
const FRAME_BUDGET_MS = 1000 / 60;
// Window covers the ~300ms animation plus any post-mount jank tail.
const CAPTURE_MS = 700;

function notify() {
  listeners.forEach((l) => l());
}

interface Capture {
  label: string;
  start: number;
  lastFrame: number;
  frames: number;
  dropped: number;
  worstMs: number;
  focusMs?: number;
  raf?: number;
}

const captures = new Map<string, Capture>();

function finalizeCapture(cap: Capture): void {
  captures.delete(cap.label);
  const elapsed = Date.now() - cap.start;
  const fps = elapsed > 0 ? Math.round((cap.frames * 1000) / elapsed) : 0;
  samples = [
    {
      label: cap.label,
      ms: cap.focusMs,
      dropped: cap.dropped,
      worstMs: Math.round(cap.worstMs),
      fps,
      at: Date.now(),
    },
    ...samples,
  ].slice(0, MAX_SAMPLES);
  notify();
}

/**
 * Record the start of a navigation transition and begin a frame-jank capture.
 * Call immediately before `navigation.navigate(...)` or `navigation.goBack()`.
 *
 * Starts a requestAnimationFrame loop that runs for CAPTURE_MS and tallies how
 * many frames the JS thread dropped while the transition was animating.
 */
export function markNavStart(label: string): void {
  const existing = captures.get(label);
  if (existing?.raf != null) {
    cancelAnimationFrame(existing.raf);
  }

  const now = Date.now();
  const cap: Capture = {
    label,
    start: now,
    lastFrame: now,
    frames: 0,
    dropped: 0,
    worstMs: 0,
  };
  captures.set(label, cap);

  const tick = () => {
    const t = Date.now();
    const dt = t - cap.lastFrame;
    cap.lastFrame = t;
    cap.frames += 1;
    if (dt > cap.worstMs) {
      cap.worstMs = dt;
    }
    // Frames missed in this interval beyond the first expected one.
    const missed = Math.max(0, Math.round(dt / FRAME_BUDGET_MS) - 1);
    cap.dropped += missed;

    if (t - cap.start >= CAPTURE_MS) {
      finalizeCapture(cap);
      return;
    }
    cap.raf = requestAnimationFrame(tick);
  };
  cap.raf = requestAnimationFrame(tick);
}

/**
 * Records time-to-focus for the in-flight capture when the screen gains focus.
 * The jank stats are finalized by the capture window itself, not by focus.
 */
export function useMarkNavEnd(label: string): void {
  const onFocus = useCallback(() => {
    const cap = captures.get(label);
    if (cap && cap.focusMs == null) {
      cap.focusMs = Date.now() - cap.start;
    }
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
  captures.forEach((cap) => {
    if (cap.raf != null) {
      cancelAnimationFrame(cap.raf);
    }
  });
  captures.clear();
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
