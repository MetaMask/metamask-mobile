import {  renderHook } from '@testing-library/react-hooks';

import usePolling from "./usePolling";

describe('usePolling', () => {

  it('Should call startPolling each input, and stopPollingByPollingToken on dismount', async () => {

    const inputs = ['foo', 'bar'];
    const mockStartPolling = jest.fn().mockImplementation((input) => `${input}_token`);
    const mockStopPollingByPollingToken = jest.fn();

    const { unmount } = renderHook(() =>
      usePolling({
        startPolling: mockStartPolling,
        stopPollingByPollingToken: mockStopPollingByPollingToken,
        input: inputs,
      })
    );

    for (const input of inputs) {
      expect(mockStartPolling).toHaveBeenCalledWith(input);
    }

    unmount();

    for (const input of inputs) {
      expect(mockStopPollingByPollingToken).toHaveBeenCalledWith(`${input}_token`);
    }
  });
});
