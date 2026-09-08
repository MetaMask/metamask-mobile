import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  formatScreenTtcAccessibilityLabel,
  getAllScreenTtc,
  isScreenTtcProbeEnabled,
  screenTtcTestId,
  subscribeScreenTtc,
  type ScreenTtcRecord,
} from './screenTtcRegistry';

const styles = StyleSheet.create({
  probe: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});

/**
 * E2E/perf-only host that exposes the latest in-app screen TTC values to
 * Appium via testID + accessibilityLabel (same mount→contentReady duration
 * recorded by useScreenPerformance / Sentry).
 */
const ScreenTtcProbeHost = () => {
  const [records, setRecords] = useState<ScreenTtcRecord[]>(() =>
    getAllScreenTtc(),
  );

  useEffect(() => {
    if (!isScreenTtcProbeEnabled()) {
      return;
    }
    return subscribeScreenTtc(() => {
      setRecords(getAllScreenTtc());
    });
  }, []);

  if (!isScreenTtcProbeEnabled() || records.length === 0) {
    return null;
  }

  return (
    <>
      {records.map((record) => (
        <View
          key={`${record.screenId}-${record.generation}`}
          testID={screenTtcTestId(record.screenId)}
          accessible
          accessibilityLabel={formatScreenTtcAccessibilityLabel(record)}
          importantForAccessibility="yes"
          pointerEvents="none"
          style={styles.probe}
        />
      ))}
    </>
  );
};

export default ScreenTtcProbeHost;
