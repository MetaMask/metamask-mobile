import React from 'react';
import { render, act } from '@testing-library/react-native';
import AgentStepHud from './AgentStepHud';
import { registerStepHudCallback } from './AgenticService';

jest.mock('./AgenticService', () => ({
  registerStepHudCallback: jest.fn(),
}));

const mockRegister = jest.mocked(registerStepHudCallback);

type StepCallback = (step: { id: string; description: string } | null) => void;

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

  it('displays step id and description when callback fires', () => {
    const { getByText } = render(<AgentStepHud />);
    const callback = getLatestCallback();

    act(() => {
      callback({ id: 'run 2/10', description: 'Open BTC position' });
    });

    expect(getByText('RUN 2/10')).toBeOnTheScreen();
    expect(getByText(/Open BTC position/)).toBeOnTheScreen();
  });

  it('renders failed status in red instead of success green', () => {
    const { getByText } = render(<AgentStepHud />);
    const callback = getLatestCallback();

    act(() => {
      callback({ id: 'fail 9/19', description: 'Close position failed' });
    });

    expect(getByText('FAIL 9/19')).toHaveStyle({ color: '#FF4D4F' });
  });

  it('shows one intent line and hides unmarked metadata lines', () => {
    const { getAllByText, queryByText } = render(<AgentStepHud />);
    const callback = getLatestCallback();

    act(() => {
      callback({
        id: 'run 1/2',
        description: 'Prepare clean state\nPrepare clean state\nperps setup',
      });
    });

    expect(getAllByText(/Prepare clean state/)).toHaveLength(1);
    expect(queryByText('perps setup')).toBeNull();
  });

  it('shows explicit subflow and error lines only', () => {
    const { getByText, queryByText } = render(<AgentStepHud />);
    const callback = getLatestCallback();

    act(() => {
      callback({
        id: 'fail 1/2',
        description:
          'Complete the validation checkpoint\nDuplicate metadata line should stay hidden\nsubflow: Prepare scenario\nerror: Timed out waiting for checkpoint',
      });
    });

    expect(getByText(/Complete the validation checkpoint/)).toBeOnTheScreen();
    expect(getByText('Prepare scenario')).toBeOnTheScreen();
    expect(
      getByText('error: Timed out waiting for checkpoint'),
    ).toBeOnTheScreen();
    expect(
      queryByText('Duplicate metadata line should stay hidden'),
    ).toBeNull();
  });

  it('hides overlay when callback fires with null', () => {
    const { toJSON } = render(<AgentStepHud />);
    const callback = getLatestCallback();

    act(() => {
      callback({ id: 'step-1', description: 'test' });
    });

    act(() => {
      callback(null);
    });

    expect(toJSON()).toBeNull();
  });
});
