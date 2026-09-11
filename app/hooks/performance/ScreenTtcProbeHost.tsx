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

/**
 * Must stay in the Android accessibility / UiAutomator tree.
 * opacity:0 + 1×1 + collapsible Views are dropped by Appium on BrowserStack.
 */
const styles = StyleSheet.create({
  probe: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: 48,
    height: 48,
    opacity: 0.011,
    zIndex: 9999,
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
    setRecords(getAllScreenTtc());
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
          collapsable={false}
          testID={screenTtcTestId(record.screenId)}
          nativeID={screenTtcTestId(record.screenId)}
          accessible
          accessibilityLabel={formatScreenTtcAccessibilityLabel(record)}
          accessibilityRole="text"
          importantForAccessibility="yes"
          pointerEvents="none"
          style={styles.probe}
        />
      ))}
    </>
  );
};

export default ScreenTtcProbeHost;
