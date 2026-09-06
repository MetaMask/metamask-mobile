import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  getLastUnlockSummary,
  signalHomepageReadyForUnlockMeter,
  subscribeUnlockNetworkMeter,
  UNLOCK_NETWORK_METER_SUMMARY_TEST_ID,
  type UnlockNetworkSummary,
} from '../../../../core/UnlockNetworkMeter';

const styles = StyleSheet.create({
  probe: {
    width: 1,
    height: 1,
    opacity: 0,
    position: 'absolute',
  },
});

/**
 * Signals unlock-window end conditions once Homepage chrome mounts, and exposes
 * the last unlock HTTP summary for Developer Options / real-network performance
 * E2E via accessibility (no Mockttp).
 */
export function useUnlockNetworkMeterEnd(): void {
  useEffect(() => {
    signalHomepageReadyForUnlockMeter();
  }, []);
}

function summaryAccessibilityLabel(summary: UnlockNetworkSummary): string {
  return JSON.stringify({
    total: summary.total,
    byHost: summary.byHost,
    endReason: summary.endReason,
    startedAt: summary.startedAt,
    endedAt: summary.endedAt,
  });
}

/**
 * Invisible probe so performance E2E can read the in-app unlock HTTP summary
 * without mocks.
 */
export function UnlockNetworkMeterProbe() {
  const [summary, setSummary] = useState<UnlockNetworkSummary | null>(
    getLastUnlockSummary,
  );

  useEffect(
    () =>
      subscribeUnlockNetworkMeter(() => {
        setSummary(getLastUnlockSummary());
      }),
    [],
  );

  if (!summary) {
    return null;
  }

  return (
    <View
      testID={UNLOCK_NETWORK_METER_SUMMARY_TEST_ID}
      accessibilityLabel={summaryAccessibilityLabel(summary)}
      accessible
      // Keep out of layout while remaining queryable by automation.
      collapsable={false}
      style={styles.probe}
    />
  );
}
