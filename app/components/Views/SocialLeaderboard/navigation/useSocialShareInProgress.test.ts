import { act, renderHook } from '@testing-library/react-native';

import { useSocialShareInProgress } from './useSocialShareInProgress';

const deferred = () => {
  let resolve: () => void = () => undefined;
  let reject: (error: Error) => void = () => undefined;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('useSocialShareInProgress', () => {
  it('reports a share in progress until it settles', async () => {
    const { result } = renderHook(() => useSocialShareInProgress());
    const share = deferred();

    act(() => result.current.runShare(() => share.promise));
    expect(result.current.isSharing).toBe(true);

    await act(async () => share.resolve());
    expect(result.current.isSharing).toBe(false);
  });

  it('ignores another share while one is in progress', async () => {
    const { result } = renderHook(() => useSocialShareInProgress());
    const first = deferred();
    const second = jest.fn(() => Promise.resolve());

    act(() => result.current.runShare(() => first.promise));
    act(() => result.current.runShare(second));
    expect(second).not.toHaveBeenCalled();

    await act(async () => first.resolve());
    act(() => result.current.runShare(second));
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('stops reporting progress when the share fails', async () => {
    const { result } = renderHook(() => useSocialShareInProgress());
    const share = deferred();

    act(() => result.current.runShare(() => share.promise));
    await act(async () => share.reject(new Error('boom')));

    expect(result.current.isSharing).toBe(false);
  });
});
