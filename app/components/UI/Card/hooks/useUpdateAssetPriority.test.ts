import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUpdateAssetPriority } from './useUpdateAssetPriority';
import Engine from '../../../../core/Engine';
import {
  FundingAssetStatus,
  type CardFundingAsset,
} from '../../../../core/Engine/controllers/card-controller/provider-types';

jest.mock('../../../../core/Engine', () => ({
  context: {
    CardController: {
      updateAssetPriority: jest.fn(),
    },
  },
}));

const mockUpdateAssetPriority = Engine.context.CardController
  .updateAssetPriority as jest.Mock;

const assetA: CardFundingAsset = {
  address: '0xusdc',
  name: 'USD Coin',
  symbol: 'USDC',
  decimals: 6,
  walletAddress: '0xwallet',
  chainId: 'eip155:59144',
  balance: '100',
  allowance: '100',
  priority: 1,
  status: FundingAssetStatus.Active,
};

const assetB: CardFundingAsset = {
  address: '0xusdt',
  name: 'Tether USD',
  symbol: 'USDT',
  decimals: 6,
  walletAddress: '0xwallet',
  chainId: 'eip155:59144',
  balance: '50',
  allowance: '50',
  priority: 2,
  status: FundingAssetStatus.Active,
};

let activeQueryClient: QueryClient;

function createWrapper() {
  activeQueryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      QueryClientProvider,
      { client: activeQueryClient },
      children,
    );
  return Wrapper;
}

describe('useUpdateAssetPriority', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateAssetPriority.mockResolvedValue(undefined);
  });

  afterEach(() => {
    activeQueryClient?.clear();
  });

  it('calls updateAssetPriority with correct asset and allAssets', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useUpdateAssetPriority(), { wrapper });

    await act(async () => {
      result.current.mutate({ asset: assetA, allAssets: [assetA, assetB] });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockUpdateAssetPriority).toHaveBeenCalledWith(assetA, [
      assetA,
      assetB,
    ]);
  });

  it('invalidates card home query on success', async () => {
    const wrapper = createWrapper();
    const invalidateSpy = jest.spyOn(activeQueryClient, 'invalidateQueries');
    const { result } = renderHook(() => useUpdateAssetPriority(), { wrapper });

    await act(async () => {
      result.current.mutate({ asset: assetA, allAssets: [assetA, assetB] });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['card', 'home'] });
  });

  it('propagates error from controller', async () => {
    mockUpdateAssetPriority.mockRejectedValue(new Error('update failed'));
    const wrapper = createWrapper();
    const { result } = renderHook(() => useUpdateAssetPriority(), { wrapper });

    await act(async () => {
      result.current.mutate({ asset: assetA, allAssets: [assetA, assetB] });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toBe('update failed');
  });
});
