import React, { useState } from 'react';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';

import { LoginViewSelectors } from './LoginView.testIds';
import {
  AGGREGATE3_BENCHMARK_BATCH_SIZE,
  runAggregate3CodecBenchmark,
  type Aggregate3BenchmarkResult,
} from '../../../core/Performance/multicallAggregate3Poc/runAggregate3CodecBenchmark';

const formatResult = (result: Aggregate3BenchmarkResult): string => {
  const lines = [`${result.batchSize} calls, median of ${result.reps}`];
  for (const variant of ['ethers', 'viem', 'handrolled'] as const) {
    const stage = result.variants[variant];
    const versusEthers =
      variant === 'ethers' ? 'baseline' : `${result.speedupVsEthers[variant]}x`;
    lines.push(`${variant}: ${stage.fullPathMs} ms (${versusEthers})`);
  }
  return lines.join('\n');
};

/**
 * Dev-only control that times the three aggregate3 codecs on-device.
 * Temporary PoC for MetaMask/core#11010.
 */
const Aggregate3CodecBenchmarkButton = (): React.ReactElement | null => {
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  if (!__DEV__) {
    return null;
  }

  const handlePress = async () => {
    setRunning(true);
    setStatus(`Measuring ${AGGREGATE3_BENCHMARK_BATCH_SIZE}-call batches…`);
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });

    try {
      const result = runAggregate3CodecBenchmark();
      const formatted = formatResult(result);
      console.warn(`AGGREGATE3_BENCH ${JSON.stringify(result)}`);
      setStatus(formatted);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`AGGREGATE3_BENCH_ERROR ${message}`);
      setStatus(message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <Box twClassName="absolute left-4 right-4 top-16 z-50 gap-2">
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Sm}
        onPress={handlePress}
        isDisabled={running}
        isLoading={running}
        testID={LoginViewSelectors.AGGREGATE3_BENCHMARK_BUTTON}
      >
        Benchmark aggregate3 (300)
      </Button>
      {status ? (
        <Text
          variant={TextVariant.BodySm}
          testID={LoginViewSelectors.AGGREGATE3_BENCHMARK_RESULT}
        >
          {status}
        </Text>
      ) : null}
    </Box>
  );
};

export default Aggregate3CodecBenchmarkButton;
