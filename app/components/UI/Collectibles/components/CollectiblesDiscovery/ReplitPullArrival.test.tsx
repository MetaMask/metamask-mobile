import React from 'react';
import { Animated, Text } from 'react-native';
import { Image } from 'expo-image';
import { act, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import ReplitPullArrival from './ReplitPullArrival';

// Native animation scheduling/image decoding contract, outside the CV renderer.
jest.mock('../CardImage', () => () => null);
const scene = (
  identity = 'event-1',
  active = true,
  backImage: string | undefined = 'https://example.com/back.png',
) => (
  <ReplitPullArrival
    identity={identity}
    active={active}
    backImage={backImage}
    artwork={<Text>Front</Text>}
  >
    <Text>Card metadata</Text>
  </ReplitPullArrival>
);

describe('Replit pull arrival sequence', () => {
  const start = jest.fn();
  const stop = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(Animated, 'parallel')
      .mockReturnValue({ start, stop, reset: jest.fn() });
    jest.spyOn(Image, 'prefetch').mockResolvedValue(true);
  });
  afterEach(() => jest.restoreAllMocks());

  it('waits for the real back image before starting and plays an identity only once', async () => {
    let resolve: (value: boolean) => void = () => undefined;
    jest.mocked(Image.prefetch).mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const { rerender } = renderWithProvider(scene());
    expect(start).not.toHaveBeenCalled();

    await act(async () => resolve(true));

    expect(start).toHaveBeenCalledTimes(1);
    rerender(scene());
    expect(start).toHaveBeenCalledTimes(1);
    rerender(scene('event-2'));
    await waitFor(() => expect(start).toHaveBeenCalledTimes(2));
  });

  it('stops and restores the card on blur without replaying the same identity', async () => {
    const { rerender } = renderWithProvider(scene());
    await waitFor(() => expect(start).toHaveBeenCalledTimes(1));

    rerender(scene('event-1', false));

    expect(stop).toHaveBeenCalledTimes(1);
    rerender(scene());
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('does not start if image loading completes after the card was hidden', async () => {
    let resolve: (value: boolean) => void = () => undefined;
    jest.mocked(Image.prefetch).mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const { rerender } = renderWithProvider(scene());
    rerender(scene('event-1', false));

    await act(async () => resolve(true));

    expect(start).not.toHaveBeenCalled();
  });

  it('keeps a static front when no real back image can be loaded', async () => {
    jest.mocked(Image.prefetch).mockResolvedValue(false);
    const { rerender } = renderWithProvider(scene());
    await act(async () => {
      await Promise.resolve();
    });

    rerender(scene('event-2', true, ''));

    expect(start).not.toHaveBeenCalled();
  });

  it('stops the native sequence when its row is unmounted', async () => {
    const { unmount } = renderWithProvider(scene());
    await waitFor(() => expect(start).toHaveBeenCalledTimes(1));

    unmount();

    expect(stop).toHaveBeenCalledTimes(1);
  });
});
