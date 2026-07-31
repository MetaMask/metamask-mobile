import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullWindowOverlay } from 'react-native-screens';

interface Step {
  id: string;
  intent: string;
  status?: string;
  progress?: { current?: number; total?: number };
  detail?: string;
  error?: string;
  nodeId?: string;
  debug?: { nodeId?: string; proofTarget?: unknown };
}

// Step bus. The HUD owns the registry so nothing outside this leaf module needs
// to import AgenticService — keeping the bridge off the static import graph, so
// it is dead-code-eliminated from release builds. AgenticService emits through
// `emitStepHud`; the mounted HUD registers its setState as the sink.
let stepSink: ((step: Step | null) => void) | null = null;

export function emitStepHud(step: Step | null) {
  stepSink?.(step);
}

function registerStepHudCallback(sink: ((step: Step | null) => void) | null) {
  stepSink = sink;
}

function statusForStep(step: Step) {
  const id = typeof step.id === 'string' ? step.id : '';
  return String(step.status ?? id.split(/\s+/)[0] ?? '').toLowerCase();
}

function progressForStep(step: Step) {
  if (
    typeof step.progress?.current === 'number' &&
    typeof step.progress?.total === 'number'
  ) {
    return `${step.progress.current}/${step.progress.total}`;
  }
  const progressPattern = /\b\d+\s*\/\s*\d+\b/;
  const id = typeof step.id === 'string' ? step.id : '';
  const match = progressPattern.exec(id);
  return match ? match[0].replace(/\s+/g, '') : null;
}

function badgeTextForStep(step: Step) {
  const rawStatus = statusForStep(step);
  const status = rawStatus === 'running' ? 'run' : rawStatus;
  const progress = progressForStep(step);
  return [status || 'run', progress].filter(Boolean).join(' ').toUpperCase();
}

function statusToneForStep(step: Step) {
  const status = statusForStep(step);
  if (status === 'fail' || status === 'failed' || status === 'error') {
    return 'fail';
  }
  if (status === 'pass' || status === 'passed' || status === 'success') {
    return 'pass';
  }
  return 'running';
}

function displayStateForStep(step: Step) {
  const intent = step.intent.trim();
  const secondary = [
    step.error ? `error: ${step.error}` : null,
    step.detail && step.detail !== intent ? step.detail : null,
  ].filter((part): part is string => Boolean(part));
  return {
    intent,
    secondary: secondary.filter(
      (part, index) => secondary.indexOf(part) === index,
    ),
  };
}

// Debug-only overlay — intentionally uses hardcoded colors for guaranteed
// contrast on both light and dark themes. Design tokens would defeat the purpose.
/* eslint-disable react-native/no-color-literals, @metamask/design-tokens/color-no-hex */
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
    paddingVertical: 3,
  },
  line: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
  },
  badgeText: {
    fontFamily: 'Courier',
    fontSize: 9,
    fontWeight: '800',
  },
  badgeTextRunning: {
    color: '#00FF88',
  },
  badgeTextPass: {
    color: '#00FF88',
  },
  badgeTextFail: {
    color: '#FF4D4F',
  },
  secondary: {
    color: '#E6E6E6',
    fontSize: 10,
    fontWeight: '400',
    lineHeight: 12,
  },
});
/* eslint-enable react-native/no-color-literals, @metamask/design-tokens/color-no-hex */

// Inner component — hooks always called unconditionally, per rules of React.
const AgentStepHudInner = () => {
  const [step, setStep] = useState<Step | null>(null);
  const insets = useSafeAreaInsets();

  const containerStyle = useMemo(
    () => [
      styles.container,
      {
        bottom: Math.max(insets.bottom, 0),
        paddingLeft: Math.max(insets.left, 10),
        paddingRight: Math.max(insets.right, 10),
      },
    ],
    [insets.left, insets.right, insets.bottom],
  );

  useEffect(() => {
    registerStepHudCallback(setStep);
    return () => {
      registerStepHudCallback(null);
    };
  }, []);

  if (!step) return null;

  const { intent, secondary } = displayStateForStep(step);
  const badge = badgeTextForStep(step);
  const tone = statusToneForStep(step);
  const badgeTextStyle =
    tone === 'fail'
      ? styles.badgeTextFail
      : tone === 'pass'
        ? styles.badgeTextPass
        : styles.badgeTextRunning;

  // FullWindowOverlay (iOS) renders the HUD in a UIWindow above every native
  // layer — including native-stack modal screens (perps close-position/TPSL,
  // etc.), which a plain absolute/zIndex View in the JS root cannot reach. On
  // Android it is a passthrough, so root-level rendering is preserved.
  return (
    <FullWindowOverlay>
      <View style={containerStyle} pointerEvents="none">
        <Text style={styles.line}>
          <Text style={[styles.badgeText, badgeTextStyle]}>{badge}</Text>
          {intent ? `  ${intent}` : ''}
        </Text>
        {secondary.map((detail) => (
          <Text key={detail} style={styles.secondary}>
            {detail}
          </Text>
        ))}
      </View>
    </FullWindowOverlay>
  );
};

// Outer guard — never calls hooks, so the __DEV__ early return is fine.
const AgentStepHud = () => {
  if (!__DEV__) return null;
  return <AgentStepHudInner />;
};

export default AgentStepHud;
