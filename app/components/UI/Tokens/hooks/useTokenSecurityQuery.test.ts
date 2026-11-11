import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { TokenSecurityData } from '@metamask/assets-controllers';
import type { CaipAssetType } from '@metamask/utils';

import { useTokenSecurityQuery } from './useTokenSecurityQuery';
import { requestTokenSecurityForAsset } from '../util/tokenSecurityBadgeBatch';
import { tokenListSecurityBadgeKeys } from '../queries/tokenSecurityBadgeKeys';

jest.mock('../util/tokenSecurityBadgeBatch', () => ({
  ...jest.requireActual('../util/tokenSecurityBadgeBatch'),
  requestTokenSecurityForAsset: jest.fn(),
}));

const mockRequestTokenSecurityForAsset = jest.mocked(
  requestTokenSecurityForAsset,
);

const USDC_LOWERCASE =
  'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as CaipAssetType;

const USDC_CHECKSUMMED =
  'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as CaipAssetType;

const SECURITY_DATA = {
  resultType: 'Verified',
  features: [],
} as unknown as TokenSecurityData;

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

const renderSecurityHook = (
  caipAssetId: CaipAssetType | null,
  options?: { enabled?: boolean },
  client: QueryClient = createQueryClient(),
) => ({
  client,
  ...renderHook(() => useTokenSecurityQuery(caipAssetId, options), {
    wrapper: ({ children }) =>
      React.createElement(QueryClientProvider, { client }, children),
  }),
});

describe('useTokenSecurityQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequestTokenSecurityForAsset.mockResolvedValue(SECURITY_DATA);
  });

  it('fetches and returns the full security payload', async () => {
    const { result } = renderSecurityHook(USDC_LOWERCASE);

    await waitFor(() => expect(result.current.data).toBe(SECURITY_DATA));
    expect(mockRequestTokenSecurityForAsset).toHaveBeenCalledWith(
      USDC_LOWERCASE,
    );
  });

  it('exposes dataUpdatedAt once the fetch resolves', async () => {
    const { result } = renderSecurityHook(USDC_LOWERCASE);

    await waitFor(() => expect(result.current.data).toBe(SECURITY_DATA));
    expect(result.current.dataUpdatedAt).toBeGreaterThan(0);
  });

  it('does not fetch when disabled', () => {
    const { result } = renderSecurityHook(USDC_LOWERCASE, { enabled: false });

    expect(mockRequestTokenSecurityForAsset).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
    expect(result.current.isPending).toBe(true);
  });

  it('does not fetch when the asset id is null', () => {
    const { result } = renderSecurityHook(null);

    expect(mockRequestTokenSecurityForAsset).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
  });

  it('defaults to enabled when no options are passed', async () => {
    const { result } = renderSecurityHook(USDC_LOWERCASE, undefined);

    await waitFor(() => expect(result.current.data).toBe(SECURITY_DATA));
  });

  it('reads an entry seeded under the normalized key without fetching', () => {
    const client = createQueryClient();
    client.setQueryData(
      tokenListSecurityBadgeKeys.byAsset(USDC_LOWERCASE),
      SECURITY_DATA,
    );

    const { result } = renderSecurityHook(USDC_CHECKSUMMED, undefined, client);

    expect(result.current.data).toBe(SECURITY_DATA);
    expect(mockRequestTokenSecurityForAsset).not.toHaveBeenCalled();
  });

  it('serves a checksummed and a lowercase caller from one fetch', async () => {
    const client = createQueryClient();

    const lowercase = renderSecurityHook(USDC_LOWERCASE, undefined, client);
    await waitFor(() =>
      expect(lowercase.result.current.data).toBe(SECURITY_DATA),
    );

    const checksummed = renderSecurityHook(USDC_CHECKSUMMED, undefined, client);

    expect(checksummed.result.current.data).toBe(SECURITY_DATA);
    expect(mockRequestTokenSecurityForAsset).toHaveBeenCalledTimes(1);
  });

  it('surfaces a null payload when the asset has no security data', async () => {
    mockRequestTokenSecurityForAsset.mockResolvedValue(null);

    const { result } = renderSecurityHook(USDC_LOWERCASE);

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
