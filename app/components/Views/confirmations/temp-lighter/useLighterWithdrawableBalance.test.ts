import { renderHook, waitFor } from '@testing-library/react-native';

import Logger from '../../../../util/Logger';
import { fetchLighterWithdrawableBalance } from './lighter-balance';
import { useLighterWithdrawableBalance } from './useLighterWithdrawableBalance';

jest.mock('./lighter-balance');
jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

describe('useLighterWithdrawableBalance', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns the fetched balance', async () => {
    jest.mocked(fetchLighterWithdrawableBalance).mockResolvedValue('5.57');

    const { result } = renderHook(() => useLighterWithdrawableBalance(true));

    await waitFor(() => expect(result.current).toBe('5.57'));
    expect(fetchLighterWithdrawableBalance).toHaveBeenCalledTimes(1);
  });

  it('does not fetch when disabled', () => {
    const { result } = renderHook(() => useLighterWithdrawableBalance(false));

    expect(result.current).toBeUndefined();
    expect(fetchLighterWithdrawableBalance).not.toHaveBeenCalled();
  });

  it('logs a failed lookup and leaves the balance unset', async () => {
    jest
      .mocked(fetchLighterWithdrawableBalance)
      .mockRejectedValue(new Error('down'));

    const { result } = renderHook(() => useLighterWithdrawableBalance(true));

    await waitFor(() => expect(Logger.error).toHaveBeenCalled());
    expect(result.current).toBeUndefined();
  });

  describe('when the balance of a previous address is loaded', () => {
    const OTHER = '0x2222222222222222222222222222222222222222';

    it('does not return it for a new address while it loads', async () => {
      jest
        .mocked(fetchLighterWithdrawableBalance)
        .mockResolvedValueOnce('5.57')
        .mockReturnValueOnce(new Promise(() => undefined));

      const { result, rerender } = renderHook(
        ({ address }: { address: string }) =>
          useLighterWithdrawableBalance(address, true),
        { initialProps: { address: USER } },
      );
      await waitFor(() => expect(result.current).toBe('5.57'));

      rerender({ address: OTHER });

      expect(result.current).toBeUndefined();
    });

    it('does not return it when the lookup for the new address fails', async () => {
      jest
        .mocked(fetchLighterWithdrawableBalance)
        .mockResolvedValueOnce('5.57')
        .mockRejectedValueOnce(new Error('down'));

      const { result, rerender } = renderHook(
        ({ address }: { address: string }) =>
          useLighterWithdrawableBalance(address, true),
        { initialProps: { address: USER } },
      );
      await waitFor(() => expect(result.current).toBe('5.57'));

      rerender({ address: OTHER });

      await waitFor(() => expect(Logger.error).toHaveBeenCalled());
      expect(result.current).toBeUndefined();
    });

    it('does not return it once disabled', async () => {
      jest.mocked(fetchLighterWithdrawableBalance).mockResolvedValue('5.57');

      const { result, rerender } = renderHook(
        ({ enabled }: { enabled: boolean }) =>
          useLighterWithdrawableBalance(USER, enabled),
        { initialProps: { enabled: true } },
      );
      await waitFor(() => expect(result.current).toBe('5.57'));

      rerender({ enabled: false });

      expect(result.current).toBeUndefined();
    });
  });
});
