import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import I18n from '../../../../../locales/i18n';
import { useSessionProfileId } from '../../../../util/notifications/hooks/useSessionProfileId';
import { fetchPerpsOutreachBanner } from '../services/perpsOutreachApi';
import { usePerpsOutreachBanner } from './usePerpsOutreachBanner';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../util/notifications/hooks/useSessionProfileId', () => ({
  useSessionProfileId: jest.fn(),
}));

jest.mock('../services/perpsOutreachApi', () => ({
  fetchPerpsOutreachBanner: jest.fn(),
}));

jest.mock('../constants/terminalApi', () => ({
  getTerminalOutreachUrl: () =>
    'https://terminal.api.cx.metamask.io/v1/outreach',
}));

const mockUseSelector = jest.mocked(useSelector);
const mockUseSessionProfileId = jest.mocked(useSessionProfileId);
const mockFetchPerpsOutreachBanner = jest.mocked(fetchPerpsOutreachBanner);

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { Wrapper, queryClient };
};

describe('usePerpsOutreachBanner', () => {
  const originalLocale = I18n.locale;

  beforeEach(() => {
    I18n.locale = 'en-US';
    mockUseSelector.mockReturnValue(undefined);
    mockUseSessionProfileId.mockReturnValue({
      profileId: undefined,
      isLoading: false,
    });
    mockFetchPerpsOutreachBanner.mockResolvedValue(null);
  });

  afterEach(() => {
    I18n.locale = originalLocale;
    jest.clearAllMocks();
  });

  it('does not request outreach when no identity is available', () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => usePerpsOutreachBanner(), {
      wrapper: Wrapper,
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockFetchPerpsOutreachBanner).not.toHaveBeenCalled();
  });

  it('requests outreach with profile, account, and locale', async () => {
    I18n.locale = 'fr-FR';
    mockUseSelector.mockReturnValue('0xabc');
    mockUseSessionProfileId.mockReturnValue({
      profileId: 'profile-1',
      isLoading: false,
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => usePerpsOutreachBanner(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockFetchPerpsOutreachBanner).toHaveBeenCalledWith({
      endpoint: 'https://terminal.api.cx.metamask.io/v1/outreach',
      profileId: 'profile-1',
      address: '0xabc',
      locale: 'fr-FR',
      signal: expect.any(AbortSignal),
    });
  });

  it('requests by address while the profile is loading', async () => {
    mockUseSelector.mockReturnValue('0xabc');
    mockUseSessionProfileId.mockReturnValue({
      profileId: undefined,
      isLoading: true,
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => usePerpsOutreachBanner(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockFetchPerpsOutreachBanner).toHaveBeenCalledWith(
      expect.objectContaining({
        profileId: undefined,
        address: '0xabc',
      }),
    );
  });

  it('uses separate cache entries for different accounts', async () => {
    let address = '0xabc';
    mockUseSelector.mockImplementation(() => address);
    const { Wrapper, queryClient } = createWrapper();
    const { result, rerender } = renderHook(() => usePerpsOutreachBanner(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    address = '0xdef';
    rerender({});

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(mockFetchPerpsOutreachBanner).toHaveBeenCalledTimes(2);
    expect(
      queryClient.getQueryCache().findAll({
        queryKey: ['perps', 'outreach'],
      }),
    ).toHaveLength(2);
  });
});
