import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getSocialProfileId } from './getSocialProfileId';
import { useSocialProfileId } from './useSocialProfileId';

jest.mock('./getSocialProfileId', () => ({
  getSocialProfileId: jest.fn(),
}));

const mockGetSocialProfileId = jest.mocked(getSocialProfileId);

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper };
};

describe('useSocialProfileId', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('starts in a loading state before resolving', () => {
    mockGetSocialProfileId.mockReturnValue(new Promise(() => undefined));
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useSocialProfileId(), {
      wrapper: Wrapper,
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.profileId).toBeUndefined();
  });

  it('exposes the resolved canonical profile ID and clears loading', async () => {
    mockGetSocialProfileId.mockResolvedValue('canonical-profile-id');
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useSocialProfileId(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.profileId).toBe('canonical-profile-id');
  });

  it('leaves profileId undefined when the session profile is unavailable', async () => {
    mockGetSocialProfileId.mockResolvedValue(undefined);
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useSocialProfileId(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.profileId).toBeUndefined();
  });

  it('dedupes concurrent consumers behind a single fetch', async () => {
    mockGetSocialProfileId.mockResolvedValue('canonical-profile-id');
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => ({ a: useSocialProfileId(), b: useSocialProfileId() }),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(result.current.a.isLoading).toBe(false);
    });
    expect(result.current.a.profileId).toBe('canonical-profile-id');
    expect(result.current.b.profileId).toBe('canonical-profile-id');
    expect(mockGetSocialProfileId).toHaveBeenCalledTimes(1);
  });
});
