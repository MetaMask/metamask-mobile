import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { AvatarMarker } from '../AdvancedChart/AdvancedChart.types';
import { useResolvedAvatarMarkers } from './useResolvedAvatarMarkers';
import {
  clearAvatarDataUris,
  ensureAvatarDataUris,
  getAvatarDataUrisSnapshot,
} from './avatarDataUriStore';

const URL_A = 'https://cdn.example/a.png';
const URL_B = 'https://cdn.example/b.png';

const makeMarkers = (): AvatarMarker[] => [
  { id: '1', time: 1, intent: 'enter', avatarUrl: URL_A, traderName: 'A' },
  { id: '2', time: 2, intent: 'exit', avatarUrl: URL_A, traderName: 'A' },
  { id: '3', time: 3, intent: 'enter', avatarUrl: URL_B, traderName: 'B' },
  { id: '4', time: 4, intent: 'enter', traderName: 'C' },
];

const dataUriFor = (url: string): string => `data:image/png;base64,${url}`;

class MockFileReader {
  result: string | null = null;
  onloadend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readAsDataURL(blob: { url: string }): void {
    this.result = dataUriFor(blob.url);
    this.onloadend?.();
  }
}

const okResponse = (url: string): unknown => ({
  ok: true,
  blob: async () => ({ url }),
});

describe('useResolvedAvatarMarkers', () => {
  const originalFetch = global.fetch;
  const originalFileReader = global.FileReader;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    clearAvatarDataUris();
    fetchMock = jest.fn(
      async (url: string): Promise<unknown> => okResponse(url),
    );
    global.fetch = fetchMock as unknown as typeof fetch;
    global.FileReader = MockFileReader as unknown as typeof FileReader;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    global.FileReader = originalFileReader;
  });

  it('dedupes images into a url-keyed table and keeps markers untouched', async () => {
    const markers = makeMarkers();

    const { result } = renderHook(() => useResolvedAvatarMarkers(markers));

    await waitFor(() =>
      expect(Object.keys(result.current.avatars)).toHaveLength(2),
    );
    expect(result.current.avatars[URL_A]).toBe(dataUriFor(URL_A));
    expect(result.current.avatars[URL_B]).toBe(dataUriFor(URL_B));
    expect(result.current.markers).toBe(markers);
    expect(result.current.markers[1].avatarUrl).toBe(URL_A);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('serves cached avatars on the first render after a remount without refetching', async () => {
    const markers = makeMarkers();
    const first = renderHook(() => useResolvedAvatarMarkers(markers));
    await waitFor(() =>
      expect(Object.keys(first.result.current.avatars)).toHaveLength(2),
    );
    first.unmount();
    fetchMock.mockClear();

    const second = renderHook(() => useResolvedAvatarMarkers(markers));

    expect(second.result.current.avatars).toEqual({
      [URL_A]: dataUriFor(URL_A),
      [URL_B]: dataUriFor(URL_B),
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps a download that finishes after unmount for the next mount', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    fetchMock.mockImplementation(async (url: string): Promise<unknown> => {
      await gate;
      return okResponse(url);
    });
    const markers = makeMarkers();
    const first = renderHook(() => useResolvedAvatarMarkers(markers));
    first.unmount();

    await act(async () => {
      release();
      await gate;
    });
    await waitFor(() =>
      expect(Object.keys(getAvatarDataUrisSnapshot())).toHaveLength(2),
    );

    const second = renderHook(() => useResolvedAvatarMarkers(markers));
    expect(Object.keys(second.result.current.avatars)).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not cache failed downloads and retries them later', async () => {
    fetchMock.mockImplementationOnce(
      async (): Promise<unknown> => ({ ok: false }),
    );

    ensureAvatarDataUris([URL_A]);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await act(async () => {
      await Promise.resolve();
    });
    expect(getAvatarDataUrisSnapshot()[URL_A]).toBeUndefined();

    ensureAvatarDataUris([URL_A]);
    await waitFor(() =>
      expect(getAvatarDataUrisSnapshot()[URL_A]).toBe(dataUriFor(URL_A)),
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
