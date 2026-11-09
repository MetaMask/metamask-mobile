import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { useSocialModerationStatus } from './useSocialModerationStatus';
import { fetchModerationStatus } from '../moderationApi';
import { useLogSocialQueryError } from '../../../../util/social/socialServiceTelemetry';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../moderationApi', () => ({
  MODERATION_STATUS_QUERY_KEY: ['social', 'moderation', 'status'],
  fetchModerationStatus: jest.fn(),
}));

jest.mock('../../../../util/social/socialServiceTelemetry', () => ({
  useLogSocialQueryError: jest.fn(),
}));

const mockUseSelector = useSelector as jest.Mock;
const mockFetchStatus = fetchModerationStatus as jest.Mock;
const mockLogError = useLogSocialQueryError as jest.Mock;

const renderStatus = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return renderHook(() => useSocialModerationStatus(), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
};

describe('useSocialModerationStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue(true);
  });

  it('reports a ban with its reason', async () => {
    mockFetchStatus.mockResolvedValue({
      banned: true,
      bannedAt: 1700000000,
      reason: 'Spam or scams',
    });

    const { result } = renderStatus();

    await waitFor(() => expect(result.current.isBanned).toBe(true));
    expect(result.current.reason).toBe('Spam or scams');
  });

  it('reports a ban without a reason when the reason is blank', async () => {
    mockFetchStatus.mockResolvedValue({
      banned: true,
      bannedAt: 1700000000,
      reason: '   ',
    });

    const { result } = renderStatus();

    await waitFor(() => expect(result.current.isBanned).toBe(true));
    expect(result.current.reason).toBeNull();
  });

  it('reports no ban for a viewer in good standing', async () => {
    mockFetchStatus.mockResolvedValue({
      banned: false,
      bannedAt: null,
      reason: null,
    });

    const { result } = renderStatus();

    await waitFor(() => expect(mockFetchStatus).toHaveBeenCalled());
    expect(result.current).toEqual({ isBanned: false, reason: null });
  });

  it('fetches nothing while the wallet is locked', () => {
    mockUseSelector.mockReturnValue(false);

    const { result } = renderStatus();

    expect(mockFetchStatus).not.toHaveBeenCalled();
    expect(result.current.isBanned).toBe(false);
  });

  it('reports no ban and logs when the fetch fails', async () => {
    const error = new Error('down');
    mockFetchStatus.mockRejectedValue(error);

    const { result } = renderStatus();

    await waitFor(() =>
      expect(mockLogError).toHaveBeenLastCalledWith(
        error,
        expect.objectContaining({ endpoint: 'moderation_status' }),
      ),
    );
    expect(result.current.isBanned).toBe(false);
  });
});
