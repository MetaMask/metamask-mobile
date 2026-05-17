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
      callback({ id: 'open-pos', description: 'Open BTC position' });
    });

    expect(getByText('open-pos')).toBeOnTheScreen();
    expect(getByText('Open BTC position')).toBeOnTheScreen();
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
