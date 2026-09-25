import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  mockFeedResponse,
  mockSpotFeedItem,
} from '../../../FeedView/mocks/coreFeed.mock';
import { TOKEN_FEED_PAGE_LIMIT } from './tokenFeedQueries';
import { useSocialV1TokenFeed } from './useSocialV1TokenFeed';

const mockCall = jest.fn();

jest.mock('../../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    controllerMessenger: {
      _brand: 'rootMessenger',
      call(this: unknown, ...args: unknown[]) {
        if (!this || (this as { _brand?: string })._brand !== 'rootMessenger') {
          throw new TypeError("Cannot read property 'getAction' of undefined");
        }
        return mockCall(...args);
      },
    },
  },
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => true),
}));

jest.mock('../../../../../../util/social/socialServiceTelemetry', () => ({
  useLogSocialQueryError: jest.fn(),
  formatSocialQueryErrorMessage: (error: unknown) =>
    error ? (error instanceof Error ? error.message : String(error)) : null,
}));

const createWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
};

const target = {
  chain: 'solana',
  contractAddress: 'pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn',
};

describe('useSocialV1TokenFeed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not call the messenger when no token is selected', () => {
    const { result } = renderHook(() => useSocialV1TokenFeed(null), {
      wrapper: createWrapper(),
    });

    expect(mockCall).not.toHaveBeenCalled();
    expect(result.current.posts).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('fetches the token feed for the selected contract', async () => {
    mockCall.mockResolvedValue(mockFeedResponse([mockSpotFeedItem()]));

    const { result } = renderHook(() => useSocialV1TokenFeed(target), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.posts).toHaveLength(1));
    expect(mockCall).toHaveBeenCalledWith('SocialService:fetchTokenFeed', {
      chain: target.chain,
      contractAddress: target.contractAddress,
      limit: TOKEN_FEED_PAGE_LIMIT,
    });
    expect(result.current.posts[0]?.item.asset.symbol).toBe('PEPE');
  });
});
