import React from 'react';
import { render, act } from '@testing-library/react-native';
import AgentStepHud from './AgentStepHud';
import { registerStepHudCallback } from './AgenticService';

jest.mock('./AgenticService', () => ({
  registerStepHudCallback: jest.fn(),
}));

const mockRegister = jest.mocked(registerStepHudCallback);

type StepCallback = (
  step: {
    id: string;
    intent: string;
    status?: string;
    progress?: { current?: number; total?: number };
    detail?: string;
    error?: string;
  } | null,
) => void;

function getLatestCallback(): StepCallback {
  const calls = mockRegister.mock.calls;
  for (let i = calls.length - 1; i >= 0; i--) {
    if (typeof calls[i][0] === 'function') return calls[i][0] as StepCallback;
  }
  throw new Error('No callback registered');
}

describe('AgentStepHud', () => {
  const originalDev = (globalThis as unknown as { __DEV__: boolean }).__DEV__;

  beforeEach(() => {
    jest.clearAllMocks();
    (globalThis as unknown as { __DEV__: boolean }).__DEV__ = true;
  });

  afterAll(() => {
    (globalThis as unknown as { __DEV__: boolean }).__DEV__ = originalDev;
  });

  it('renders nothing when no step is active', () => {
    const { toJSON } = render(<AgentStepHud />);

    expect(toJSON()).toBeNull();
  });

  it('registers callback on mount and deregisters on unmount', () => {
    const { unmount } = render(<AgentStepHud />);

    expect(mockRegister).toHaveBeenCalledWith(expect.any(Function));

    unmount();

    expect(mockRegister).toHaveBeenCalledWith(null);
  });

  it('displays status, progress, and intent when callback fires', () => {
    const { getByText } = render(<AgentStepHud />);
    const callback = getLatestCallback();

    act(() => {
      callback({
        id: 'validate/open-market',
        status: 'running',
        progress: { current: 2, total: 10 },
        intent: 'Open BTC position',
      });
    });

    expect(getByText('RUN 2/10')).toBeOnTheScreen();
    expect(getByText(/Open BTC position/)).toBeOnTheScreen();
  });

  it('renders failed status in red instead of success green', () => {
    const { getByText } = render(<AgentStepHud />);
    const callback = getLatestCallback();

    act(() => {
      callback({
        id: 'validate/close',
        status: 'fail',
        intent: 'Close failed',
      });
    });

    expect(getByText('FAIL')).toHaveStyle({ color: '#FF4D4F' });
  });

  it('shows one intent line and hides node metadata', () => {
    const { getAllByText, queryByText } = render(<AgentStepHud />);
    const callback = getLatestCallback();

    act(() => {
      callback({
        id: 'run 1/2',
        intent: 'Prepare clean state',
      });
    });

    expect(getAllByText(/Prepare clean state/)).toHaveLength(1);
    expect(queryByText('run 1/2')).toBeNull();
  });

  it('shows error and explicit detail lines only', () => {
    const { getByText } = render(<AgentStepHud />);
    const callback = getLatestCallback();

    act(() => {
      callback({
        id: 'fail 1/2',
        intent: 'Complete the validation checkpoint',
        detail: 'Prepare scenario',
        error: 'Timed out waiting for checkpoint',
      });
    });

    expect(getByText(/Complete the validation checkpoint/)).toBeOnTheScreen();
    expect(getByText('Prepare scenario')).toBeOnTheScreen();
    expect(
      getByText('error: Timed out waiting for checkpoint'),
    ).toBeOnTheScreen();
  });

  it('hides overlay when callback fires with null', () => {
    const { toJSON } = render(<AgentStepHud />);
    const callback = getLatestCallback();

    act(() => {
      callback({ id: 'step-1', intent: 'test' });
    });

    act(() => {
      callback(null);
    });

    expect(toJSON()).toBeNull();
  });
});
