import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUpdateFundingPriority } from './useUpdateFundingPriority';
import Engine from '../../../../core/Engine';
import {
  FundingAssetStatus,
  type CardFundingAsset,
} from '../../../../core/Engine/controllers/card-controller/provider-types';
import { FundingStatus, type CardFundingToken } from '../types';

jest.mock('../../../../core/Engine', () => ({
  context: {
    CardController: {
      updateAssetPriority: jest.fn(),
    },
  },
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

import { useSelector } from 'react-redux';

const mockUseSelector = useSelector as jest.Mock;

const mockUpdateAssetPriority = Engine.context.CardController
  .updateAssetPriority as jest.Mock;

const fundingAssetA: CardFundingAsset = {
  address: '0xusdc',
  name: 'USD Coin',
  symbol: 'USDC',
  decimals: 6,
  walletAddress: '0xwallet',
  chainId: 'eip155:59144',
  spendableBalance: '100',
  spendingCap: '100',
  priority: 1,
  status: FundingAssetStatus.Active,
};

const fundingAssetB: CardFundingAsset = {
  address: '0xusdt',
  name: 'Tether USD',
  symbol: 'USDT',
  decimals: 6,
  walletAddress: '0xwallet',
  chainId: 'eip155:59144',
  spendableBalance: '50',
  spendingCap: '50',
  priority: 2,
  status: FundingAssetStatus.Active,
};

const tokenA: CardFundingToken = {
  address: '0xusdc',
  name: 'USD Coin',
  symbol: 'USDC',
  decimals: 6,
  walletAddress: '0xwallet',
  caipChainId: 'eip155:59144',
  spendableBalance: '100',
  spendingCap: '100',
  priority: 1,
  fundingStatus: FundingStatus.Enabled,
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

function mockCardHomeData(fundingAssets: CardFundingAsset[]) {
  mockUseSelector.mockReturnValue({ fundingAssets });
}

describe('useUpdateFundingPriority', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateAssetPriority.mockResolvedValue(undefined);
    mockCardHomeData([fundingAssetA, fundingAssetB]);
  });

  afterEach(() => {
    activeQueryClient?.clear();
  });

  it('calls updateAssetPriority with the matched asset and all funding assets', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useUpdateFundingPriority(), {
      wrapper,
    });

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.updateFundingPriority(tokenA);
    });

    expect(success).toBe(true);
    expect(mockUpdateAssetPriority).toHaveBeenCalledWith(fundingAssetA, [
      fundingAssetA,
      fundingAssetB,
    ]);
  });

  it('invalidates card home query on success', async () => {
    const wrapper = createWrapper();
    const invalidateSpy = jest.spyOn(activeQueryClient, 'invalidateQueries');
    const { result } = renderHook(() => useUpdateFundingPriority(), {
      wrapper,
    });

    await act(async () => {
      await result.current.updateFundingPriority(tokenA);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['card', 'home'] });
  });

  it('returns false and calls onError when token is not found', async () => {
    mockCardHomeData([]);
    const onError = jest.fn();
    const wrapper = createWrapper();
    const { result } = renderHook(() => useUpdateFundingPriority({ onError }), {
      wrapper,
    });

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.updateFundingPriority(tokenA);
    });

    expect(success).toBe(false);
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(mockUpdateAssetPriority).not.toHaveBeenCalled();
  });

  it('returns false and calls onError when controller throws', async () => {
    mockUpdateAssetPriority.mockRejectedValue(new Error('update failed'));
    const onError = jest.fn();
    const wrapper = createWrapper();
    const { result } = renderHook(() => useUpdateFundingPriority({ onError }), {
      wrapper,
    });

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.updateFundingPriority(tokenA);
    });

    expect(success).toBe(false);
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect((onError.mock.calls[0][0] as Error).message).toBe('update failed');
  });

  it('calls onSuccess callback on successful update', async () => {
    const onSuccess = jest.fn();
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useUpdateFundingPriority({ onSuccess }),
      { wrapper },
    );

    await act(async () => {
      await result.current.updateFundingPriority(tokenA);
    });

    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
});
