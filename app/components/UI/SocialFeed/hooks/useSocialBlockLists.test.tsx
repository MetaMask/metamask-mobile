import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { useSocialBlockLists } from './useSocialBlockLists';
import {
  fetchBlockedCommentIds,
  fetchBlockedProfileIds,
} from '../moderationApi';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../moderationApi', () => ({
  BLOCKED_PROFILE_IDS_QUERY_KEY: ['social', 'moderation', 'blockedProfileIds'],
  BLOCKED_COMMENT_IDS_QUERY_KEY: ['social', 'moderation', 'blockedCommentIds'],
  fetchBlockedProfileIds: jest.fn(),
  fetchBlockedCommentIds: jest.fn(),
}));

jest.mock('../../../../util/social/socialServiceTelemetry', () => ({
  useLogSocialQueryError: jest.fn(),
}));

const mockUseSelector = useSelector as jest.Mock;
const mockFetchProfiles = fetchBlockedProfileIds as jest.Mock;
const mockFetchComments = fetchBlockedCommentIds as jest.Mock;

const renderBlockLists = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return renderHook(() => useSocialBlockLists(), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
};

describe('useSocialBlockLists', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue(true);
    mockFetchProfiles.mockResolvedValue(['trader-1']);
    mockFetchComments.mockResolvedValue(['comment-1']);
  });

  it('returns the viewer’s blocked traders and comments', async () => {
    const { result } = renderBlockLists();

    await waitFor(() =>
      expect(result.current.blockedProfileIds.has('trader-1')).toBe(true),
    );
    expect(result.current.blockedCommentIds.has('comment-1')).toBe(true);
  });

  it('fetches nothing and hides nothing while the wallet is locked', () => {
    mockUseSelector.mockReturnValue(false);

    const { result } = renderBlockLists();

    expect(mockFetchProfiles).not.toHaveBeenCalled();
    expect(mockFetchComments).not.toHaveBeenCalled();
    expect(result.current.blockedProfileIds.size).toBe(0);
    expect(result.current.blockedCommentIds.size).toBe(0);
  });

  it('hides nothing when a fetch fails', async () => {
    mockFetchProfiles.mockRejectedValue(new Error('HTTP 500'));

    const { result } = renderBlockLists();

    await waitFor(() =>
      expect(result.current.blockedCommentIds.has('comment-1')).toBe(true),
    );
    expect(result.current.blockedProfileIds.size).toBe(0);
  });
});
