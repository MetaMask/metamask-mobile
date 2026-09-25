import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { FeedResponse } from '@metamask/social-controllers';
import { useSocialV1TokenFeed } from './useSocialV1TokenFeed';

const mockCall = jest.fn();

jest.mock('../../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    controllerMessenger: {
      call: (...args: unknown[]) => mockCall(...args),
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

/**
 * The idle `queryFn` only runs when React Query invokes it with no target.
 * The hook disables that query, so capture the function and call it directly.
 */
let capturedQueryFn:
  | ((context: { pageParam?: string }) => Promise<FeedResponse>)
  | undefined;

jest.mock('@tanstack/react-query', () => {
  const actual = jest.requireActual(
    '@tanstack/react-query',
  ) as typeof import('@tanstack/react-query');
  return {
    ...actual,
    useInfiniteQuery: (options: {
      queryFn: (context: { pageParam?: string }) => Promise<FeedResponse>;
    }) => {
      capturedQueryFn = options.queryFn;
      return actual.useInfiniteQuery({ ...options, enabled: false });
    },
  };
});

const createWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
};

describe('useSocialV1TokenFeed idle query', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedQueryFn = undefined;
  });

  it('resolves an empty page when the query runs without a target', async () => {
    renderHook(() => useSocialV1TokenFeed(null), {
      wrapper: createWrapper(),
    });

    expect(capturedQueryFn).toBeDefined();
    await expect(capturedQueryFn?.({ pageParam: undefined })).resolves.toEqual({
      items: [],
      pagination: { olderCursor: null, newerCursor: null },
    });
    expect(mockCall).not.toHaveBeenCalled();
  });
});
