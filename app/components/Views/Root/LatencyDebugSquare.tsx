import React, { useEffect, useState } from 'react';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { getLatencyDebugSnapshot } from '../../../util/deviceCapability/latencyStore';

const POLL_MS = 500;

export const LATENCY_DEBUG_SQUARE_TEST_ID = 'latency-debug-square';

interface LatencyDebugSquareProps {
  enabled: boolean;
}

/** `__DEV__` overlay. Reports the measured samples. It does not delay fetches. */
const LatencyDebugSquare = ({ enabled }: LatencyDebugSquareProps) => {
  const [snapshot, setSnapshot] = useState(getLatencyDebugSnapshot);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    const id = setInterval(
      () => setSnapshot(getLatencyDebugSnapshot()),
      POLL_MS,
    );
    return () => clearInterval(id);
  }, [enabled]);

  if (!enabled) {
    return null;
  }

  const values = [
    snapshot.bucket,
    snapshot.hardwareRow,
    snapshot.transportLabel,
    `${snapshot.medianMs ?? '-'} ms`,
    `hung ${snapshot.hungCount}`,
    `n ${snapshot.sampleCount}`,
  ];

  return (
    <Box
      testID={LATENCY_DEBUG_SQUARE_TEST_ID}
      pointerEvents="none"
      twClassName="absolute bottom-36 right-2 w-24 p-1 bg-error-default"
    >
      {values.map((value) => (
        <Text
          key={value}
          variant={TextVariant.BodyXs}
          color={TextColor.PrimaryInverse}
        >
          {value}
        </Text>
      ))}
    </Box>
  );
};

export default LatencyDebugSquare;
