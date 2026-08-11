// TEMP on-screen perf readout (Remove before merge).
//
// Prod/minified bundles strip console.log, so this floating overlay surfaces the
// last CTA->VISIBLE measurement (from perf-marker.ts) directly on screen. Mounted
// once at the app root; ignores touches so it never blocks the UI.
//
// Throwaway QA-only component: the design-token / color-literal lint rules are
// disabled deliberately rather than wiring it into the theme system.
/* eslint-disable react-native/no-color-literals, @metamask/design-tokens/color-no-hex */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { subscribePerf } from './perf-marker';
import { subscribeJstrace, type JstraceStatus } from './jstrace-runtime';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    zIndex: 99999,
  },
  text: {
    color: '#00FF00',
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  jtText: {
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  meanText: {
    color: '#7FFF7F',
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
});

// Compact human-readable event count (1234567 -> "1.2M", 12345 -> "12.3K").
function fmtCount(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)}M`;
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(1)}K`;
  }
  return String(n);
}

// Map a jstrace status to overlay text + color. Yellow while active, green when
// the file has flushed to disk, red on error, orange when the ring wrapped
// (trace truncated).
function jtLine(s: JstraceStatus): { label: string; color: string } {
  switch (s.kind) {
    case 'recording':
      return { label: 'JT: recording…', color: '#FFD400' };
    case 'writing':
      return { label: 'JT: writing…', color: '#FFD400' };
    case 'written':
      return s.wrapped
        ? {
            label: `JT: written ${fmtCount(s.events)} ev ⚠ WRAPPED`,
            color: '#FF8C00',
          }
        : { label: `JT: written ${fmtCount(s.events)} ev ✓`, color: '#00FF00' };
    case 'error':
      return { label: `JT: write FAILED — ${s.message}`, color: '#FF3B30' };
    default:
      return { label: '', color: '#00FF00' };
  }
}

export function PerfOverlay(): React.ReactElement | null {
  const [ms, setMs] = useState<number | null>(null);
  const [jt, setJt] = useState<JstraceStatus | null>(null);
  // Every CTA→VISIBLE sample seen since this overlay mounted (i.e. the current
  // app session). Kept in a ref so appending doesn't itself trigger a render;
  // the derived mean/count below live in state so the line updates.
  const samplesRef = useRef<number[]>([]);
  const [stats, setStats] = useState<{ count: number; mean: number } | null>(
    null,
  );

  // The jstrace runtime only installs `__jtStart` when the app was built with
  // JSTRACE=1 (see index.js). When tracing isn't enabled we don't subscribe and
  // never render the JT status line — the overlay shows only CTA→VISIBLE.
  const jstraceEnabled =
    typeof (globalThis as Record<string, unknown>).__jtStart === 'function';

  const onSample = useCallback((sample: number) => {
    setMs(sample);
    const samples = samplesRef.current;
    samples.push(sample);
    const sum = samples.reduce((acc, value) => acc + value, 0);
    setStats({ count: samples.length, mean: Math.round(sum / samples.length) });
  }, []);

  useEffect(() => subscribePerf(onSample), [onSample]);
  useEffect(() => {
    if (!jstraceEnabled) {
      return undefined;
    }
    return subscribeJstrace(setJt);
  }, [jstraceEnabled]);

  // Render as soon as EITHER signal has fired, so the jstrace status is visible
  // even before the first CTA→VISIBLE completes.
  if (ms === null && jt === null) {
    return null;
  }

  const jtInfo = jt ? jtLine(jt) : null;

  return (
    <View pointerEvents="none" style={styles.container}>
      {ms !== null && <Text style={styles.text}>{`CTA→VISIBLE: ${ms}ms`}</Text>}
      {stats && stats.count > 1 && (
        <Text
          style={styles.meanText}
        >{`mean ${stats.mean}ms · n=${stats.count}`}</Text>
      )}
      {jtInfo && (
        <Text style={[styles.jtText, { color: jtInfo.color }]}>
          {jtInfo.label}
        </Text>
      )}
    </View>
  );
}
