import {
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { TwapOrder } from '@metamask/perps-controller';
import React, { memo, useEffect, useState } from 'react';
import { PERPS_TWAP_UI_CONFIG } from '../../../constants/perpsConfig';
import { formatTwapElapsedClock } from '../../../utils/twapFormat';

interface PerpsProTwapElapsedProps {
  /** Epoch milliseconds the venue recorded as the schedule's start. */
  startedAt: TwapOrder['startedAt'];
  /** Scheduled runtime, used as the upper bound and the total shown. */
  durationMinutes: TwapOrder['durationMinutes'];
  /** Only an active schedule keeps counting; terminal ones are frozen. */
  isActive: boolean;
  /**
   * Elapsed time the provider measured when it built the last snapshot. Used
   * for terminal schedules, whose final elapsed time cannot be derived from
   * the current clock.
   */
  snapshotElapsedMilliseconds: TwapOrder['elapsedTimeMilliseconds'];
  testID?: string;
}

const clampElapsed = (elapsedMilliseconds: number, durationMs: number) =>
  Math.min(durationMs, Math.max(0, elapsedMilliseconds));

/**
 * The elapsed/total runtime of one TWAP schedule, ticking once per second.
 *
 * The controller reports `elapsedTimeMilliseconds` as of the moment it built
 * its last snapshot, so between deliveries that number is frozen. An active
 * schedule therefore derives elapsed from `startedAt` against the current
 * clock instead, which both removes the dependency on snapshot cadence and
 * gives the seconds a reviewer expects to see moving. A terminal schedule has
 * stopped, so it keeps the provider's final measurement.
 *
 * Isolated and memoised like `FundingCountdown` so the per-second update
 * repaints this row rather than the whole card.
 */
const PerpsProTwapElapsed = ({
  startedAt,
  durationMinutes,
  isActive,
  snapshotElapsedMilliseconds,
  testID,
}: PerpsProTwapElapsedProps) => {
  const durationMs =
    durationMinutes *
    PERPS_TWAP_UI_CONFIG.SecondsPerMinute *
    PERPS_TWAP_UI_CONFIG.MillisecondsPerSecond;
  const [elapsedMs, setElapsedMs] = useState(() =>
    isActive
      ? clampElapsed(Date.now() - startedAt, durationMs)
      : clampElapsed(snapshotElapsedMilliseconds, durationMs),
  );

  useEffect(() => {
    if (!isActive) {
      return undefined;
    }

    const tick = () =>
      setElapsedMs(clampElapsed(Date.now() - startedAt, durationMs));

    tick();
    const intervalId = setInterval(
      tick,
      PERPS_TWAP_UI_CONFIG.MillisecondsPerSecond,
    );

    return () => clearInterval(intervalId);
  }, [durationMs, isActive, startedAt]);

  // A terminal schedule has stopped, so it keeps whatever the venue measured
  // last rather than any clock-derived value.
  useEffect(() => {
    if (isActive) {
      return;
    }

    setElapsedMs(clampElapsed(snapshotElapsedMilliseconds, durationMs));
  }, [durationMs, isActive, snapshotElapsedMilliseconds]);

  return (
    <Text
      variant={TextVariant.BodyXs}
      fontWeight={FontWeight.Medium}
      testID={testID}
    >
      {`${formatTwapElapsedClock(elapsedMs)} / ${formatTwapElapsedClock(
        durationMs,
      )}`}
    </Text>
  );
};

export default memo(PerpsProTwapElapsed);
