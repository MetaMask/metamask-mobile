import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getSessionProfileId } from '../utils/get-session-profile-id';
import { useSessionProfileId } from './useSessionProfileId';

jest.mock('../utils/get-session-profile-id', () => ({
  getSessionProfileId: jest.fn(),
}));

const mockGetSessionProfileId = jest.mocked(getSessionProfileId);

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, cacheTime: 0 } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper, queryClient };
};

describe('useSessionProfileId', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('starts in a loading state before resolving', () => {
    mockGetSessionProfileId.mockReturnValue(new Promise(() => undefined));
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useSessionProfileId(), {
      wrapper: Wrapper,
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.profileId).toBeUndefined();
  });

  it('exposes the resolved profile ID and clears loading', async () => {
    mockGetSessionProfileId.mockResolvedValue('test-profile-id');
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useSessionProfileId(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.profileId).toBe('test-profile-id');
    expect(mockGetSessionProfileId).toHaveBeenCalledTimes(1);
  });

  it('leaves profileId undefined when the session profile is unavailable', async () => {
    mockGetSessionProfileId.mockResolvedValue(undefined);
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useSessionProfileId(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.profileId).toBeUndefined();
  });

  it('dedupes concurrent consumers behind a single fetch', async () => {
    mockGetSessionProfileId.mockResolvedValue('test-profile-id');
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => ({ a: useSessionProfileId(), b: useSessionProfileId() }),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(result.current.a.isLoading).toBe(false);
    });
    expect(result.current.a.profileId).toBe('test-profile-id');
    expect(result.current.b.profileId).toBe('test-profile-id');
    expect(mockGetSessionProfileId).toHaveBeenCalledTimes(1);
  });
});
