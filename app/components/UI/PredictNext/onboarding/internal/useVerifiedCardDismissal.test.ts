import { act, renderHook, waitFor } from '@testing-library/react-native';

import { PREDICT_NEXT_VERIFIED_CARD_DISMISSED } from '../../../../../constants/storage';
import StorageWrapper from '../../../../../store/storage-wrapper';
import { useVerifiedCardDismissal } from './useVerifiedCardDismissal';

jest.mock('../../../../../store/storage-wrapper', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const getItem = jest.mocked(StorageWrapper.getItem);
const setItem = jest.mocked(StorageWrapper.setItem);
const key = `${PREDICT_NEXT_VERIFIED_CARD_DISMISSED}:profile-example`;

// ES2022 does not provide Promise.withResolvers.
const deferred = <Value>(): {
  promise: Promise<Value>;
  resolve: (value: Value) => void;
} => {
  let resolve!: (value: Value) => void;
  const promise = new Promise<Value>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

describe('useVerifiedCardDismissal', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    getItem.mockResolvedValue(null);
    setItem.mockResolvedValue();
  });

  it.each([
    ['true', true],
    ['false', false],
    ['malformed', false],
    [null, false],
  ])('loads %s as dismissed=%s', async (value, dismissed) => {
    getItem.mockResolvedValue(value);
    const { result } = renderHook(() =>
      useVerifiedCardDismissal({
        canonicalProfileId: 'profile-example',
        isVerified: true,
      }),
    );

    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(result.current.isDismissed).toBe(dismissed);
    expect(getItem).toHaveBeenCalledWith(key);
    expect(key).toBe(
      '@MetaMask:predictNextVerifiedCardDismissed:v1:profile-example',
    );
  });

  it('treats a failed read as not dismissed', async () => {
    getItem.mockRejectedValue(new Error('storage'));
    const { result } = renderHook(() =>
      useVerifiedCardDismissal({
        canonicalProfileId: 'profile-example',
        isVerified: true,
      }),
    );

    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(result.current.isDismissed).toBe(false);
  });

  it('reads only after verification and retains the result across status changes', async () => {
    const { result, rerender } = renderHook(
      ({ isVerified }) =>
        useVerifiedCardDismissal({
          canonicalProfileId: 'profile-example',
          isVerified,
        }),
      { initialProps: { isVerified: false } },
    );
    expect(getItem).not.toHaveBeenCalled();

    rerender({ isVerified: true });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    rerender({ isVerified: false });
    rerender({ isVerified: true });

    expect(getItem).toHaveBeenCalledTimes(1);
  });

  it('reuses the pending read when verification temporarily regresses', async () => {
    const read = deferred<string | null>();
    getItem.mockReturnValue(read.promise);
    const { result, rerender } = renderHook(
      ({ isVerified }) =>
        useVerifiedCardDismissal({
          canonicalProfileId: 'profile-example',
          isVerified,
        }),
      { initialProps: { isVerified: true } },
    );

    rerender({ isVerified: false });
    rerender({ isVerified: true });
    await act(async () => {
      read.resolve('true');
      await read.promise;
    });

    expect(getItem).toHaveBeenCalledTimes(1);
    expect(result.current.isDismissed).toBe(true);
  });

  it('hides immediately and writes the plain preference once', async () => {
    const read = deferred<string | null>();
    getItem.mockReturnValue(read.promise);
    const { result } = renderHook(() =>
      useVerifiedCardDismissal({
        canonicalProfileId: 'profile-example',
        isVerified: true,
      }),
    );

    act(() => {
      result.current.dismiss();
      result.current.dismiss();
    });
    await act(async () => {
      read.resolve(null);
      await read.promise;
    });

    expect(result.current.isDismissed).toBe(true);
    expect(result.current.isLoaded).toBe(true);
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(setItem).toHaveBeenCalledWith(key, 'true');
  });

  it('keeps the card hidden when the write fails', async () => {
    setItem.mockRejectedValue(new Error('storage'));
    const { result } = renderHook(() =>
      useVerifiedCardDismissal({
        canonicalProfileId: 'profile-example',
        isVerified: true,
      }),
    );

    await act(async () => {
      result.current.dismiss();
    });

    expect(result.current.isDismissed).toBe(true);
  });

  it('ignores old reads and stale callbacks after identity replacement', async () => {
    const oldRead = deferred<string | null>();
    const newRead = deferred<string | null>();
    getItem
      .mockReturnValueOnce(oldRead.promise)
      .mockReturnValueOnce(newRead.promise);
    const { result, rerender } = renderHook(
      ({ profile }) =>
        useVerifiedCardDismissal({
          canonicalProfileId: profile,
          isVerified: true,
        }),
      { initialProps: { profile: 'profile-example' } },
    );
    const staleDismiss = result.current.dismiss;

    rerender({ profile: 'other-profile' });
    act(() => staleDismiss());
    await act(async () => {
      oldRead.resolve('true');
      await oldRead.promise;
    });
    expect(result.current.isLoaded).toBe(false);
    await act(async () => {
      newRead.resolve(null);
      await newRead.promise;
    });

    expect(result.current.isDismissed).toBe(false);
    expect(setItem).not.toHaveBeenCalled();
    expect(getItem).toHaveBeenLastCalledWith(
      `${PREDICT_NEXT_VERIFIED_CARD_DISMISSED}:other-profile`,
    );
  });

  it('does not read or dismiss without an identity or verified status', () => {
    const initialProps: { profile: string | null; isVerified: boolean } = {
      profile: null,
      isVerified: true,
    };
    const { result, rerender } = renderHook(
      ({
        profile,
        isVerified,
      }: {
        profile: string | null;
        isVerified: boolean;
      }) =>
        useVerifiedCardDismissal({ canonicalProfileId: profile, isVerified }),
      { initialProps },
    );

    act(() => result.current.dismiss());
    rerender({ profile: 'profile-example', isVerified: false });
    act(() => result.current.dismiss());

    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
  });
});
