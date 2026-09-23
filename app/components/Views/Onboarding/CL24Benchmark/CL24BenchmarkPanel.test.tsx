import Clipboard from '@react-native-clipboard/clipboard';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

import { OnboardingSelectorIDs } from '../Onboarding.testIds';
import CL24BenchmarkPanel from './CL24BenchmarkPanel';
import { type CL24BenchmarkResult, runCL24Benchmark } from './cl24Benchmark';

jest.mock('@react-native-clipboard/clipboard', () => ({
  __esModule: true,
  default: {
    setString: jest.fn(),
  },
}));

jest.mock('react-native-device-info', () => ({
  getBuildNumber: jest.fn(() => '123'),
  getModel: jest.fn(() => 'Test Phone'),
  getSystemName: jest.fn(() => 'Test OS'),
  getSystemVersion: jest.fn(() => '1.0'),
  getVersion: jest.fn(() => '7.0.0'),
}));

jest.mock('./cl24Benchmark', () => ({
  ...jest.requireActual('./cl24Benchmark'),
  runCL24Benchmark: jest.fn(),
}));

const mockRunCL24Benchmark = runCL24Benchmark as jest.MockedFunction<
  typeof runCL24Benchmark
>;

const createResult = (): CL24BenchmarkResult => {
  const statistics = { min: 1, median: 2, max: 3 };
  const sample = {
    keyGeneration: 2,
    initialExport: 2,
    shareRefresh: 2,
    rosterUpdate: 2,
    finalExport: 2,
    total: 10,
  };

  return {
    configuration: {
      curve: 'secp256k1',
      initialPartyCount: 2,
      threshold: 2,
      updatedPartyCount: 3,
      transport: 'event-driven-in-memory',
      warmupIterations: 1,
      sampleIterations: 5,
    },
    metadata: {
      appVersion: '7.0.0',
      buildNumber: '123',
      device: 'Test Phone',
      operatingSystem: 'Test OS 1.0',
    },
    samples: [sample],
    summary: {
      keyGeneration: statistics,
      initialExport: statistics,
      shareRefresh: statistics,
      rosterUpdate: statistics,
      finalExport: statistics,
      total: statistics,
    },
    timestamp: '2026-09-23T00:00:00.000Z',
  };
};

describe('CL24BenchmarkPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows progress and renders completed benchmark results', async () => {
    let resolveBenchmark: (result: CL24BenchmarkResult) => void = () =>
      undefined;
    mockRunCL24Benchmark.mockReturnValue(
      new Promise((resolve) => {
        resolveBenchmark = resolve;
      }),
    );
    const { getByTestId, queryByTestId } = render(<CL24BenchmarkPanel />);

    fireEvent.press(getByTestId(OnboardingSelectorIDs.CL24_BENCHMARK_BUTTON));

    expect(
      getByTestId(OnboardingSelectorIDs.CL24_BENCHMARK_RUNNING),
    ).toBeOnTheScreen();

    await act(async () => {
      resolveBenchmark(createResult());
    });

    await waitFor(() =>
      expect(
        getByTestId(OnboardingSelectorIDs.CL24_BENCHMARK_RESULT),
      ).toBeOnTheScreen(),
    );
    expect(
      queryByTestId(OnboardingSelectorIDs.CL24_BENCHMARK_RUNNING),
    ).toBeNull();
  });

  it('copies the machine-readable result', async () => {
    const result = createResult();
    mockRunCL24Benchmark.mockResolvedValue(result);
    const { getByTestId } = render(<CL24BenchmarkPanel />);

    fireEvent.press(getByTestId(OnboardingSelectorIDs.CL24_BENCHMARK_BUTTON));
    await waitFor(() =>
      expect(
        getByTestId(OnboardingSelectorIDs.CL24_BENCHMARK_COPY_BUTTON),
      ).toBeOnTheScreen(),
    );
    fireEvent.press(
      getByTestId(OnboardingSelectorIDs.CL24_BENCHMARK_COPY_BUTTON),
    );

    expect(Clipboard.setString).toHaveBeenCalledWith(
      JSON.stringify(result, null, 2),
    );
  });

  it('renders an error when the benchmark rejects', async () => {
    mockRunCL24Benchmark.mockRejectedValue(new Error('Benchmark failed'));
    const { getByTestId } = render(<CL24BenchmarkPanel />);

    fireEvent.press(getByTestId(OnboardingSelectorIDs.CL24_BENCHMARK_BUTTON));

    await waitFor(() =>
      expect(
        getByTestId(OnboardingSelectorIDs.CL24_BENCHMARK_ERROR),
      ).toHaveTextContent('Benchmark failed'),
    );
  });
});
