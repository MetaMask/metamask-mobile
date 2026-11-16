import { act, renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useSocialListPaging,
  type SocialListPagingQuery,
} from './useSocialListPaging';

const queryKey = ['social-list-paging'] as const;

const createQuery = (
  overrides: Partial<SocialListPagingQuery> = {},
): SocialListPagingQuery => ({
  hasNextPage: true,
  isFetchingNextPage: false,
  isError: false,
  isFetchNextPageError: false,
  error: null,
  fetchNextPage: jest.fn().mockResolvedValue(undefined),
  refetch: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const renderPaging = (
  query: SocialListPagingQuery,
  enabled = true,
): ReturnType<typeof renderHook> & { client: QueryClient } => {
  const client = new QueryClient();
  const wrapper = ({
    children,
  }: {
    children: React.ReactNode;
  }): React.ReactElement =>
    React.createElement(QueryClientProvider, { client }, children);
  return {
    client,
    ...renderHook(() => useSocialListPaging(query, queryKey, enabled), {
      wrapper,
    }),
  };
};

describe('useSocialListPaging', () => {
  it('requests the next page, and skips another request while one is in flight', () => {
    const query = createQuery();
    const client = new QueryClient();
    const wrapper = ({
      children,
    }: {
      children: React.ReactNode;
    }): React.ReactElement =>
      React.createElement(QueryClientProvider, { client }, children);
    const { result, rerender } = renderHook(
      (current: SocialListPagingQuery) =>
        useSocialListPaging(current, queryKey),
      { wrapper, initialProps: query },
    );

    act(() => {
      result.current.loadMore();
    });
    rerender({ ...query, isFetchingNextPage: true });
    act(() => {
      result.current.loadMore();
    });

    expect(query.fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('hides a next-page failure from the full-screen error and retries only from the button', () => {
    const query = createQuery({
      isError: true,
      isFetchNextPageError: true,
      error: new Error('page down'),
    });
    const { result } = renderPaging(query);

    act(() => {
      result.current.loadMore();
    });
    act(() => {
      result.current.retryLoadMore();
    });

    expect(result.current.isLoadMoreError).toBe(true);
    expect(result.current.surfacedError).toBeNull();
    expect(result.current.hasNextPage).toBe(false);
    expect(query.fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('keeps a first-page failure on the surfaced error and does not treat it as a paging retry', () => {
    const failure = new Error('feed down');
    const query = createQuery({
      hasNextPage: false,
      isError: true,
      isFetchNextPageError: false,
      error: failure,
    });
    const { result } = renderPaging(query);

    act(() => {
      result.current.retryLoadMore();
    });

    expect(result.current.isLoadMoreError).toBe(false);
    expect(result.current.surfacedError).toBe(failure);
    expect(query.fetchNextPage).not.toHaveBeenCalled();
  });

  it('reports nothing while the list is disabled', () => {
    const failure = new Error('feed down');
    const { result } = renderPaging(
      createQuery({ isError: true, error: failure }),
      false,
    );

    act(() => {
      result.current.loadMore();
    });

    expect(result.current.isFetchingNextPage).toBe(false);
    expect(result.current.hasNextPage).toBe(false);
    expect(result.current.isLoadMoreError).toBe(false);
    expect(result.current.surfacedError).toBeNull();
  });

  it('drops later pages and refetches the first page', async () => {
    const query = createQuery();
    const { client, result } = renderPaging(query);
    client.setQueryData(queryKey, {
      pages: ['first', 'second'],
      pageParams: [undefined, 'cursor'],
    });

    await act(async () => {
      await result.current.refreshFirstPage();
    });

    expect(client.getQueryData(queryKey)).toEqual({
      pages: ['first'],
      pageParams: [undefined],
    });
    expect(query.refetch).toHaveBeenCalledTimes(1);
  });
});
