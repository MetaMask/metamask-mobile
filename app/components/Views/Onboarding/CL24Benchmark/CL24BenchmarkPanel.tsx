import Clipboard from '@react-native-clipboard/clipboard';
import {
  Box,
  BoxAlignItems,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import {
  getBuildNumber,
  getModel,
  getSystemName,
  getSystemVersion,
  getVersion,
} from 'react-native-device-info';

import Logger from '../../../../util/Logger';
import { OnboardingSelectorIDs } from '../Onboarding.testIds';
import {
  type CL24BenchmarkResult,
  type CL24BenchmarkStage,
  runCL24Benchmark,
} from './cl24Benchmark';

const STAGE_LABELS: Record<CL24BenchmarkStage, string> = {
  keyGeneration: 'Keygen',
  initialExport: 'Initial export',
  shareRefresh: 'Refresh',
  rosterUpdate: 'Add party',
  finalExport: 'Final export',
  total: 'Total',
};

function formatMilliseconds(value: number): string {
  return `${value.toFixed(1)} ms`;
}

function formatResult(result: CL24BenchmarkResult): string {
  return (
    Object.entries(result.summary) as [
      CL24BenchmarkStage,
      CL24BenchmarkResult['summary'][CL24BenchmarkStage],
    ][]
  )
    .map(
      ([stage, statistics]) =>
        `${STAGE_LABELS[stage]}: ${formatMilliseconds(statistics.median)} ` +
        `(${formatMilliseconds(statistics.min)}–${formatMilliseconds(statistics.max)})`,
    )
    .join('\n');
}

const CL24BenchmarkPanel = () => {
  const [result, setResult] = useState<CL24BenchmarkResult>();
  const [error, setError] = useState<string>();
  const [isRunning, setIsRunning] = useState(false);

  const metadata = useMemo(
    () => ({
      appVersion: getVersion(),
      buildNumber: getBuildNumber(),
      device: getModel(),
      operatingSystem: `${getSystemName()} ${getSystemVersion()}`,
    }),
    [],
  );

  const handleRun = useCallback(async () => {
    setError(undefined);
    setResult(undefined);
    setIsRunning(true);

    try {
      const benchmarkResult = await runCL24Benchmark(metadata);
      setResult(benchmarkResult);
      Logger.log('[CL24 benchmark]', JSON.stringify(benchmarkResult, null, 2));
    } catch (benchmarkError) {
      setError(
        benchmarkError instanceof Error
          ? benchmarkError.message
          : 'Unknown CL24 benchmark error',
      );
    } finally {
      setIsRunning(false);
    }
  }, [metadata]);

  const handleCopy = useCallback(() => {
    if (result) {
      Clipboard.setString(JSON.stringify(result, null, 2));
    }
  }, [result]);

  return (
    <Box gap={2} alignItems={BoxAlignItems.Center}>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Md}
        isFullWidth
        isDisabled={isRunning}
        onPress={handleRun}
        testID={OnboardingSelectorIDs.CL24_BENCHMARK_BUTTON}
      >
        {isRunning ? 'Running CL24 benchmark…' : 'Run CL24 benchmark'}
      </Button>

      {isRunning && (
        <ActivityIndicator
          size="small"
          testID={OnboardingSelectorIDs.CL24_BENCHMARK_RUNNING}
        />
      )}

      {error && (
        <Text
          variant={TextVariant.BodySm}
          twClassName="text-error-default text-center"
          testID={OnboardingSelectorIDs.CL24_BENCHMARK_ERROR}
        >
          {error}
        </Text>
      )}

      {result && (
        <Box gap={2} alignItems={BoxAlignItems.Center}>
          <Text
            variant={TextVariant.BodyXs}
            twClassName="text-default text-center"
            testID={OnboardingSelectorIDs.CL24_BENCHMARK_RESULT}
          >
            Median (min–max), 5 samples, party-1 CPU{'\n'}
            {formatResult(result)}
          </Text>
          <Button
            variant={ButtonVariant.Tertiary}
            size={ButtonSize.Sm}
            onPress={handleCopy}
            testID={OnboardingSelectorIDs.CL24_BENCHMARK_COPY_BUTTON}
          >
            Copy benchmark JSON
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default CL24BenchmarkPanel;
