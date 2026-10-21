import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { FeedItem } from '@metamask/social-controllers';
import type { CaipAssetType } from '@metamask/utils';
import { useSelector } from 'react-redux';
import { useLogSocialQueryError } from '../../../../../../util/social/socialServiceTelemetry';
import { TOKEN_HOLDERS_FIXTURE } from './tokenHolders.fixture';
import {
  fetchTokenHoldersPage,
  type TokenHoldersPage,
} from './tokenHoldersQueries';
import { useTokenHolders } from './useTokenHolders';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => true),
}));

jest.mock('../../../../../../util/social/socialServiceTelemetry', () => ({
  useLogSocialQueryError: jest.fn(),
  formatSocialQueryErrorMessage: (error: unknown) =>
    error ? (error instanceof Error ? error.message : String(error)) : null,
}));

jest.mock('./tokenHoldersQueries', () => {
  const actual = jest.requireActual('./tokenHoldersQueries');
  return { ...actual, fetchTokenHoldersPage: jest.fn() };
});

const mockUseSelector = jest.mocked(useSelector);
const mockUseLogSocialQueryError = jest.mocked(useLogSocialQueryError);
const mockFetchPage = jest.mocked(fetchTokenHoldersPage);

const assetId =
  'eip155:1/erc20:0x6982508145454ce325ddbe47a25d4ec3d2311933' as CaipAssetType;

const createWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
  return { client, wrapper };
};

/** A fixture row, optionally reshaped to exercise one field. */
const holder = (
  index: number,
  overrides: Partial<FeedItem> = {},
): FeedItem => ({
  ...TOKEN_HOLDERS_FIXTURE.items[index],
  ...overrides,
});

const page = (items: FeedItem[], hasMore = false): TokenHoldersPage => ({
  items,
  pagination: { hasMore },
});

const renderTokenHolders = (
  options: Parameters<typeof useTokenHolders>[0] = { assetId },
) =>
  renderHook(() => useTokenHolders(options), {
    wrapper: createWrapper().wrapper,
  });

describe('useTokenHolders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue(true);
    mockFetchPage.mockResolvedValue(page(TOKEN_HOLDERS_FIXTURE.items));
  });

  it('requests the holders of the asset it was given', async () => {
    const { result } = renderTokenHolders();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockFetchPage).toHaveBeenCalledWith(
      assetId,
      expect.objectContaining({ page: 1 }),
    );
  });

  it('leaves exited positions out: a holders list is current holdings', async () => {
    mockFetchPage.mockResolvedValue(
      page([
        holder(0, { positionId: 'open-1', isOpen: true }),
        holder(1, { positionId: 'closed-1', isOpen: false }),
        holder(2, { positionId: 'open-2', isOpen: true }),
      ]),
    );

    const { result } = renderTokenHolders();

    await waitFor(() => expect(result.current.rows).toHaveLength(2));
    expect(result.current.rows.map((row) => row.core.positionId)).toStrictEqual(
      ['open-1', 'open-2'],
    );
  });

  it('keeps the order the route returned rather than re-sorting by value', async () => {
    mockFetchPage.mockResolvedValue(
      page([
        holder(0, { positionId: 'small', currentValueUSD: 10 }),
        holder(1, { positionId: 'large', currentValueUSD: 9_000_000 }),
      ]),
    );

    const { result } = renderTokenHolders();

    await waitFor(() => expect(result.current.rows).toHaveLength(2));
    expect(result.current.rows.map((row) => row.core.positionId)).toStrictEqual(
      ['small', 'large'],
    );
  });

  it('stays idle while the wallet is locked', () => {
    mockUseSelector.mockReturnValue(false);

    const { result } = renderTokenHolders();

    expect(mockFetchPage).not.toHaveBeenCalled();
    expect(result.current.rows).toStrictEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('stays idle while disabled', () => {
    const { result } = renderTokenHolders({ assetId, enabled: false });

    expect(mockFetchPage).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it('reports a normalised error and logs it', async () => {
    mockFetchPage.mockRejectedValue(new Error('holders route exploded'));

    const { result } = renderTokenHolders();

    await waitFor(() =>
      expect(result.current.error).toBe('holders route exploded'),
    );
    expect(result.current.rows).toStrictEqual([]);
    expect(mockUseLogSocialQueryError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        source: 'useTokenHolders',
        operation: 'fetch_token_holders',
        queryParams: { assetId },
      }),
    );
  });

  it('does not offer another page once the route says there are no more', async () => {
    const { result } = renderTokenHolders();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasNextPage).toBe(false);
  });

  it('appends the next page and stops when the route says so', async () => {
    mockFetchPage
      .mockResolvedValueOnce(page([holder(0, { positionId: 'page-1' })], true))
      .mockResolvedValueOnce(page([holder(1, { positionId: 'page-2' })]));

    const { result } = renderTokenHolders();

    await waitFor(() => expect(result.current.hasNextPage).toBe(true));
    act(() => result.current.loadMore());

    await waitFor(() => expect(result.current.rows).toHaveLength(2));
    expect(result.current.rows.map((row) => row.core.positionId)).toStrictEqual(
      ['page-1', 'page-2'],
    );
    expect(result.current.hasNextPage).toBe(false);
    expect(mockFetchPage).toHaveBeenNthCalledWith(
      2,
      assetId,
      expect.objectContaining({ page: 2 }),
    );
  });

  it('ignores loadMore when no page remains', async () => {
    const { result } = renderTokenHolders();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.loadMore());

    expect(mockFetchPage).toHaveBeenCalledTimes(1);
  });

  it('drops paged-in rows on refresh, so the list returns to the first page', async () => {
    mockFetchPage
      .mockResolvedValueOnce(page([holder(0, { positionId: 'page-1' })], true))
      .mockResolvedValueOnce(page([holder(1, { positionId: 'page-2' })]))
      .mockResolvedValue(page([holder(0, { positionId: 'page-1-again' })]));

    const { result } = renderTokenHolders();

    await waitFor(() => expect(result.current.hasNextPage).toBe(true));
    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.rows).toHaveLength(2));

    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => expect(result.current.rows).toHaveLength(1));
    expect(result.current.rows[0].core.positionId).toBe('page-1-again');
  });
});
