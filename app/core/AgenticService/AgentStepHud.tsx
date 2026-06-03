import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { registerStepHudCallback } from './AgenticService';

interface Step {
  id: string;
  description?: string;
  status?: string;
  intent?: string;
  progress?: { current?: number; total?: number };
  detail?: string;
  error?: string;
  nodeId?: string;
  debug?: { nodeId?: string; proofTarget?: unknown };
}

function statusForStep(step: Step) {
  return String(step.status ?? step.id.split(/\s+/)[0] ?? '').toLowerCase();
}

function progressForStep(step: Step) {
  if (
    typeof step.progress?.current === 'number' &&
    typeof step.progress?.total === 'number'
  ) {
    return `${step.progress.current}/${step.progress.total}`;
  }
  const progressPattern = /\b\d+\s*\/\s*\d+\b/;
  const match = progressPattern.exec(step.id);
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

function legacyDescriptionParts(description?: string) {
  return String(description ?? '')
    .split('\n')
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part, index, parts) => parts.indexOf(part) === index);
}

function legacySecondaryDisplayText(part: string) {
  const errorPrefix = 'error:';
  const detailPrefix = 'detail:';
  const debugPrefix = 'debug ';
  const normalized = part.toLowerCase();

  if (normalized.startsWith(errorPrefix)) return part;
  if (normalized.startsWith(detailPrefix)) {
    return part.slice(detailPrefix.length).trim();
  }
  if (normalized.startsWith(debugPrefix)) return null;
  return null;
}

function displayStateForStep(step: Step) {
  const legacyParts = legacyDescriptionParts(step.description);
  const intent = String(step.intent ?? legacyParts[0] ?? '').trim();
  const secondary = [
    step.error ? `error: ${step.error}` : null,
    step.detail && step.detail !== intent ? step.detail : null,
    ...legacyParts.slice(1).map(legacySecondaryDisplayText),
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

  return (
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
  );
};

// Outer guard — never calls hooks, so the __DEV__ early return is fine.
const AgentStepHud = () => {
  if (!__DEV__) return null;
  return <AgentStepHudInner />;
};

export default AgentStepHud;
