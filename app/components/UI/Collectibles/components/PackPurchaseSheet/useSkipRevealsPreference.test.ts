import AsyncStorage from '@react-native-async-storage/async-storage';
import { createDeferredPromise } from '@metamask/utils';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import {
  COLLECTIBLES_SKIP_REVEALS_KEY,
  useSkipRevealsPreference,
} from './useSkipRevealsPreference';

describe('useSkipRevealsPreference', () => {
  beforeEach(() => {
    jest.mocked(AsyncStorage.getItem).mockReset().mockResolvedValue(null);
    jest.mocked(AsyncStorage.setItem).mockReset().mockResolvedValue();
  });

  it('restores an explicitly enabled preference', async () => {
    jest.mocked(AsyncStorage.getItem).mockResolvedValue('true');

    const { result } = renderHook(useSkipRevealsPreference);

    await waitFor(() => expect(result.current.skipReveal).toBe(true));
  });

  it('does not overwrite a new selection when storage responds late', async () => {
    const read = createDeferredPromise<string | null>();
    jest.mocked(AsyncStorage.getItem).mockReturnValue(read.promise);
    const { result } = renderHook(useSkipRevealsPreference);

    act(() => result.current.updateSkipReveal(true));
    await act(async () => read.resolve('false'));

    expect(result.current.skipReveal).toBe(true);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      COLLECTIBLES_SKIP_REVEALS_KEY,
      'true',
    );
  });

  it('serializes rapid writes so the final preference wins', async () => {
    const write = createDeferredPromise<void>();
    jest.mocked(AsyncStorage.setItem).mockReturnValueOnce(write.promise);
    const { result } = renderHook(useSkipRevealsPreference);

    act(() => {
      result.current.updateSkipReveal(true);
      result.current.updateSkipReveal(false);
    });
    await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1));
    await act(async () => write.resolve());

    expect(AsyncStorage.setItem).toHaveBeenNthCalledWith(
      2,
      COLLECTIBLES_SKIP_REVEALS_KEY,
      'false',
    );
    expect(result.current.skipReveal).toBe(false);
  });

  it('keeps the choice for this purchase when saving fails', async () => {
    jest
      .mocked(AsyncStorage.setItem)
      .mockRejectedValue(new Error('Storage unavailable'));
    const { result } = renderHook(useSkipRevealsPreference);

    act(() => result.current.updateSkipReveal(true));

    await waitFor(() => expect(result.current.saveFailed).toBe(true));
    expect(result.current.skipReveal).toBe(true);
  });
});
