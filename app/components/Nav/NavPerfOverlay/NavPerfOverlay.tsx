// DEMO-ONLY: floating perf overlay for stack transition comparison videos.
// Remove this component (and mount in App.tsx) before merging to main.
/* eslint-disable @metamask/design-tokens/color-no-hex, react-native/no-color-literals */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  clearNavPerfSamples,
  type NavPerfSample,
  useJsFps,
  useNavPerfSamples,
} from '../../../util/navigation/navPerf';

const SHORT_LABELS: Record<string, string> = {
  SettingsMenu: 'Settings menu',
  'SettingsMenu (back)': 'Settings menu ←',
  Settings: 'Settings',
  'Settings (back)': 'Settings ←',
  BridgeView: 'Bridge',
  'BridgeView (back)': 'Bridge ←',
  'Bridge.TokenSelector': 'Token picker',
  'Send.Amount': 'Send amount',
  Asset: 'Asset',
  'Asset (back)': 'Asset ←',
};

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 88,
    right: 10,
    zIndex: 9999,
    maxWidth: 300,
  },
  panel: {
    backgroundColor: 'rgba(0,0,0,0.88)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Menlo',
  },
  idleFps: {
    fontSize: 12,
    fontFamily: 'Menlo',
    fontWeight: '600',
  },
  idleGood: { color: '#4ade80' },
  idleMid: { color: '#facc15' },
  idleBad: { color: '#f87171' },
  hint: {
    color: '#9ca3af',
    fontSize: 11,
    fontFamily: 'Menlo',
    marginBottom: 10,
    lineHeight: 15,
  },
  empty: {
    color: '#6b7280',
    fontSize: 13,
    fontFamily: 'Menlo',
    fontStyle: 'italic',
  },
  sampleCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  sampleCardBad: {
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.35)',
  },
  flowName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Menlo',
    marginBottom: 8,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metric: {
    minWidth: 58,
  },
  metricLabel: {
    color: '#9ca3af',
    fontSize: 10,
    fontFamily: 'Menlo',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 16,
    fontFamily: 'Menlo',
    fontWeight: '700',
  },
  metricGood: { color: '#4ade80' },
  metricMid: { color: '#facc15' },
  metricBad: { color: '#f87171' },
  metricNeutral: { color: '#e5e7eb' },
  clearButton: {
    alignSelf: 'flex-end',
    marginTop: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  clearText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Menlo',
    fontWeight: '600',
  },
});

const idleFpsStyle = (fps: number) => {
  if (fps >= 55) {
    return styles.idleGood;
  }
  if (fps >= 30) {
    return styles.idleMid;
  }
  return styles.idleBad;
};

const shortLabel = (label: string) => SHORT_LABELS[label] ?? label;

const isSampleBad = (s: NavPerfSample) => s.dropped > 0 || s.worstMs > 20;

const droppedStyle = (dropped: number) => {
  if (dropped === 0) {
    return styles.metricGood;
  }
  if (dropped <= 2) {
    return styles.metricMid;
  }
  return styles.metricBad;
};

const worstStyle = (worstMs: number) => {
  if (worstMs <= 20) {
    return styles.metricGood;
  }
  if (worstMs <= 35) {
    return styles.metricMid;
  }
  return styles.metricBad;
};

const fpsStyle = (fps: number) => {
  if (fps >= 55) {
    return styles.metricGood;
  }
  if (fps >= 40) {
    return styles.metricMid;
  }
  return styles.metricBad;
};

interface MetricProps {
  label: string;
  value: string;
  valueStyle: object;
}

const Metric = ({ label, value, valueStyle }: MetricProps) => (
  <View style={styles.metric}>
    <Text style={styles.metricLabel}>{label}</Text>
    <Text style={[styles.metricValue, valueStyle]}>{value}</Text>
  </View>
);

const SampleCard = ({ sample }: { sample: NavPerfSample }) => {
  const bad = isSampleBad(sample);

  return (
    <View style={[styles.sampleCard, bad && styles.sampleCardBad]}>
      <Text style={styles.flowName}>{shortLabel(sample.label)}</Text>
      <View style={styles.metricsRow}>
        <Metric
          label="DROPPED"
          value={String(sample.dropped)}
          valueStyle={droppedStyle(sample.dropped)}
        />
        <Metric
          label="WORST"
          value={`${sample.worstMs}ms`}
          valueStyle={worstStyle(sample.worstMs)}
        />
        <Metric
          label="FPS"
          value={String(sample.fps)}
          valueStyle={fpsStyle(sample.fps)}
        />
        {sample.ms != null ? (
          <Metric
            label="MOUNT"
            value={`${sample.ms}ms`}
            valueStyle={styles.metricNeutral}
          />
        ) : null}
      </View>
    </View>
  );
};

export const NavPerfOverlay: React.FC = () => {
  const samples = useNavPerfSamples();
  const fps = useJsFps();

  return (
    <View pointerEvents="box-none" style={styles.root}>
      <View pointerEvents="none" style={styles.panel}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Nav perf</Text>
          <Text style={[styles.idleFps, idleFpsStyle(fps)]}>
            idle {fps} fps
          </Text>
        </View>
        <Text style={styles.hint}>
          Compare DROPPED + WORST during the 700ms transition window.
        </Text>
        {samples.length === 0 ? (
          <Text style={styles.empty}>No transitions yet</Text>
        ) : (
          samples.map((s) => (
            <SampleCard key={`${s.at}-${s.label}`} sample={s} />
          ))
        )}
      </View>
      <Pressable onPress={clearNavPerfSamples} style={styles.clearButton}>
        <Text style={styles.clearText}>Clear</Text>
      </Pressable>
    </View>
  );
};
