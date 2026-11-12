import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, AppState } from 'react-native';
import { Text, TextVariant } from '@metamask/design-system-react-native';
import { formatUsd } from '../../providers/pack-partner/utils/format';

interface Props {
  value: number;
  from?: number;
  durationMs?: number;
  delayMs?: number;
  isActive?: boolean;
  variant?: TextVariant;
  testID?: string;
  formatValue?: (value: number) => string;
  precision?: number;
}

/** PackBatchSummary's original 1300ms cubic count-up, with native lifecycle cleanup. */
export default function ReplitAnimatedAmount({
  value,
  from = 0,
  durationMs = 1300,
  delayMs = 0,
  isActive = true,
  variant = TextVariant.DisplayMd,
  testID,
  formatValue = formatUsd,
  precision: requestedPrecision,
}: Props) {
  const [reduced, setReduced] = useState(true);
  const [foreground, setForeground] = useState(
    AppState.currentState === 'active',
  );
  const [displayed, setDisplayed] = useState(value);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => mounted && setReduced(enabled))
      .catch(() => undefined);
    const motion = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduced,
    );
    const app = AppState.addEventListener('change', (state) =>
      setForeground(state === 'active'),
    );
    return () => {
      mounted = false;
      motion.remove();
      app.remove();
    };
  }, []);
  useEffect(() => {
    if (reduced || !isActive || !foreground || durationMs <= 0) {
      setDisplayed(value);
      return;
    }
    let frame = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const precision = requestedPrecision ?? (Number.isInteger(value) ? 1 : 100);
    const start = () => {
      const startedAt = performance.now();
      const tick = (now: number) => {
        const progress = Math.min(
          1,
          Math.max(0, (now - startedAt) / durationMs),
        );
        setDisplayed(
          progress === 1
            ? value
            : Math.round(
                (from + (value - from) * (1 - Math.pow(1 - progress, 3))) *
                  precision,
              ) / precision,
        );
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };
    setDisplayed(from);
    if (delayMs > 0) timer = setTimeout(start, delayMs);
    else start();
    return () => {
      cancelAnimationFrame(frame);
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [
    value,
    from,
    durationMs,
    delayMs,
    isActive,
    foreground,
    reduced,
    requestedPrecision,
  ]);
  return (
    <Text
      variant={variant}
      accessibilityLabel={formatValue(value)}
      testID={testID}
    >
      {formatValue(displayed)}
    </Text>
  );
}
