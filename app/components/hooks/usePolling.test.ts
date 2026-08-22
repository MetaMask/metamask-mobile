import { renderHook } from '@testing-library/react-hooks';

import usePolling from './usePolling';

describe('usePolling', () => {
  it('Should start/stop polling when inputs are added/removed, and stop on dismount', async () => {
    const inputs = ['foo', 'bar'];
    const mockStartPolling = jest
      .fn()
      .mockImplementation((input) => `${input}_token`);
    const mockStopPollingByPollingToken = jest.fn();

    const { unmount, rerender } = renderHook(() =>
      usePolling({
        startPolling: mockStartPolling,
        stopPollingByPollingToken: mockStopPollingByPollingToken,
        input: inputs,
      }),
    );

    // All inputs should start polling
    for (const input of inputs) {
      expect(mockStartPolling).toHaveBeenCalledWith(input);
    }

    // Remove one input, and add another
    inputs[0] = 'baz';
    rerender({ input: inputs });
    expect(mockStopPollingByPollingToken).toHaveBeenCalledWith('foo_token');
    expect(mockStartPolling).toHaveBeenCalledWith('baz');

    // All inputs should stop polling on dismount
    unmount();
    for (const input of inputs) {
      expect(mockStopPollingByPollingToken).toHaveBeenCalledWith(
        `${input}_token`,
      );
    }
  });

  it('does not start or stop polling when re-rendered with unchanged inputs', () => {
    const inputs = ['foo', 'bar'];
    const mockStartPolling = jest
      .fn()
      .mockImplementation((input) => `${input}_token`);
    const mockStopPollingByPollingToken = jest.fn();

    const { rerender } = renderHook(() =>
      usePolling({
        startPolling: mockStartPolling,
        stopPollingByPollingToken: mockStopPollingByPollingToken,
        input: inputs,
      }),
    );

    expect(mockStartPolling).toHaveBeenCalledTimes(2);

    // Same input contents -> the deep-equality dependency is unchanged, so the
    // effect must not re-run and no polls should be (re)started or stopped.
    rerender({ input: inputs });

    expect(mockStartPolling).toHaveBeenCalledTimes(2);
    expect(mockStopPollingByPollingToken).not.toHaveBeenCalled();
  });
});
