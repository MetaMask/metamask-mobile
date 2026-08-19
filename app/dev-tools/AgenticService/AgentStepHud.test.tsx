import React from 'react';
import { render, act } from '@testing-library/react-native';
import AgentStepHud, { emitStepHud } from './AgentStepHud';

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

  it('stops rendering steps after unmount', () => {
    const { unmount, queryByText } = render(<AgentStepHud />);

    act(() => {
      emitStepHud({ id: 'step-1', intent: 'before unmount' });
    });
    expect(queryByText(/before unmount/)).toBeOnTheScreen();

    unmount();

    // Sink is deregistered on unmount, so a late emit is a harmless no-op.
    expect(() =>
      act(() => {
        emitStepHud({ id: 'step-2', intent: 'after unmount' });
      }),
    ).not.toThrow();
  });

  it('displays status, progress, and intent when a step is emitted', () => {
    const { getByText } = render(<AgentStepHud />);

    act(() => {
      emitStepHud({
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

    act(() => {
      emitStepHud({
        id: 'validate/close',
        status: 'fail',
        intent: 'Close failed',
      });
    });

    expect(getByText('FAIL')).toHaveStyle({ color: '#FF4D4F' });
  });

  it('shows one intent line and hides node metadata', () => {
    const { getAllByText, queryByText } = render(<AgentStepHud />);

    act(() => {
      emitStepHud({
        id: 'run 1/2',
        intent: 'Prepare clean state',
      });
    });

    expect(getAllByText(/Prepare clean state/)).toHaveLength(1);
    expect(queryByText('run 1/2')).toBeNull();
  });

  it('shows error and explicit detail lines only', () => {
    const { getByText } = render(<AgentStepHud />);

    act(() => {
      emitStepHud({
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

  it('hides overlay when a null step is emitted', () => {
    const { toJSON } = render(<AgentStepHud />);

    act(() => {
      emitStepHud({ id: 'step-1', intent: 'test' });
    });

    act(() => {
      emitStepHud(null);
    });

    expect(toJSON()).toBeNull();
  });
});
