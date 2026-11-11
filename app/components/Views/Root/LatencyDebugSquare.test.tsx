import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import LatencyDebugSquare, {
  LATENCY_DEBUG_SQUARE_TEST_ID,
} from './LatencyDebugSquare';
import {
  clearLatencySamples,
  recordFetchSample,
} from '../../../util/deviceCapability/latencyStore';

describe('LatencyDebugSquare', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    clearLatencySamples();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders nothing when disabled', () => {
    render(<LatencyDebugSquare enabled={false} />);

    expect(screen.queryByTestId(LATENCY_DEBUG_SQUARE_TEST_ID)).toBeNull();
  });

  it('shows the bucket, hardware row, median, hung count, and sample count', () => {
    render(<LatencyDebugSquare enabled />);

    act(() => {
      [15000, 15000, 900].forEach((durationMs) =>
        recordFetchSample({ atMs: Date.now(), durationMs }),
      );
      jest.advanceTimersByTime(500);
    });

    expect(screen.getByTestId(LATENCY_DEBUG_SQUARE_TEST_ID)).toBeOnTheScreen();
    expect(screen.getByText('slow')).toBeOnTheScreen();
    expect(screen.getByText('MID')).toBeOnTheScreen();
    expect(screen.getByText('-')).toBeOnTheScreen();
    expect(screen.getByText('15000 ms')).toBeOnTheScreen();
    expect(screen.getByText('hung 2')).toBeOnTheScreen();
    expect(screen.getByText('n 3')).toBeOnTheScreen();
  });
});
