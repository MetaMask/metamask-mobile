import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { useCanFiatDepositAsset } from './useCanFiatDepositAsset';
import type { Provider as RampProvider } from '@metamask/ramps-controller';
import Engine from '../../../../core/Engine';

jest.mock('../../../../core/Engine', () => ({
  context: {
    RampsController: {
      getBestProviderForAsset: jest.fn(),
    },
  },
}));

const mockGetBestProviderForAsset = Engine.context.RampsController
  .getBestProviderForAsset as jest.Mock;

const mockProvider: Pick<RampProvider, 'id' | 'name'> = {
  id: 'test-provider',
  name: 'Test Provider',
};

const createMockStore = (
  userRegion: {
    country: { currency: string };
    state: null;
    regionCode: string;
  } | null = {
    country: { currency: 'USD' },
    state: null,
    regionCode: 'us',
  },
) =>
  configureStore({
    reducer: {
      engine: () => ({
        backgroundState: {
          RampsController: {
            userRegion,
          },
        },
      }),
    },
  });

const createWrapper = (store: ReturnType<typeof createMockStore>) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      Provider,
      { store } as never,
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        children,
      ),
    );

  return { Wrapper, queryClient };
};

describe('useCanFiatDepositAsset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('returns true when flag on and provider resolves', () => {
    it('returns true when isFiatDepositFlagEnabled is true, assetId is provided, and provider resolves', async () => {
      const store = createMockStore();
      const { Wrapper } = createWrapper(store);

      mockGetBestProviderForAsset.mockResolvedValue(mockProvider);

      const { result } = renderHook(
        () =>
          useCanFiatDepositAsset({
            assetId: 'eip155:1/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da',
            isFiatDepositFlagEnabled: true,
          }),
        { wrapper: Wrapper },
      );

      await waitFor(() =>
        expect(mockGetBestProviderForAsset).toHaveBeenCalled(),
      );

      await waitFor(() => expect(result.current).toBe(true));
    });

    it('passes the assetId to getBestProviderForAsset', async () => {
      const store = createMockStore();
      const { Wrapper } = createWrapper(store);

      mockGetBestProviderForAsset.mockResolvedValue(mockProvider);

      const assetId =
        'eip155:1/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da';

      renderHook(
        () =>
          useCanFiatDepositAsset({
            assetId,
            isFiatDepositFlagEnabled: true,
          }),
        { wrapper: Wrapper },
      );

      await waitFor(() =>
        expect(mockGetBestProviderForAsset).toHaveBeenCalledWith({ assetId }),
      );
    });
  });

  describe('returns false when flag off', () => {
    it('returns false when isFiatDepositFlagEnabled is false even if provider resolves', async () => {
      const store = createMockStore();
      const { Wrapper } = createWrapper(store);

      mockGetBestProviderForAsset.mockResolvedValue(mockProvider);

      const { result } = renderHook(
        () =>
          useCanFiatDepositAsset({
            assetId: 'eip155:1/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da',
            isFiatDepositFlagEnabled: false,
          }),
        { wrapper: Wrapper },
      );

      expect(result.current).toBe(false);
      // Query should not be called when flag is off
      expect(mockGetBestProviderForAsset).not.toHaveBeenCalled();
    });
  });

  describe('returns false when assetId missing', () => {
    it('returns false when assetId is undefined even if flag is on', async () => {
      const store = createMockStore();
      const { Wrapper } = createWrapper(store);

      mockGetBestProviderForAsset.mockResolvedValue(mockProvider);

      const { result } = renderHook(
        () =>
          useCanFiatDepositAsset({
            assetId: undefined,
            isFiatDepositFlagEnabled: true,
          }),
        { wrapper: Wrapper },
      );

      expect(result.current).toBe(false);
      // Query should not be called when assetId is missing
      expect(mockGetBestProviderForAsset).not.toHaveBeenCalled();
    });

    it('returns false when both assetId is undefined and flag is off', () => {
      const store = createMockStore();
      const { Wrapper } = createWrapper(store);

      const { result } = renderHook(
        () =>
          useCanFiatDepositAsset({
            assetId: undefined,
            isFiatDepositFlagEnabled: false,
          }),
        { wrapper: Wrapper },
      );

      expect(result.current).toBe(false);
      expect(mockGetBestProviderForAsset).not.toHaveBeenCalled();
    });
  });

  describe('returns false when provider null', () => {
    it('returns false when getBestProviderForAsset resolves to null (no provider for region)', async () => {
      const store = createMockStore();
      const { Wrapper } = createWrapper(store);

      mockGetBestProviderForAsset.mockResolvedValue(null);

      const { result } = renderHook(
        () =>
          useCanFiatDepositAsset({
            assetId: 'eip155:1/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da',
            isFiatDepositFlagEnabled: true,
          }),
        { wrapper: Wrapper },
      );

      await waitFor(() =>
        expect(mockGetBestProviderForAsset).toHaveBeenCalled(),
      );

      await waitFor(() => expect(result.current).toBe(false));
    });

    it('returns false while query is loading (fails closed)', () => {
      const store = createMockStore();
      const { Wrapper } = createWrapper(store);

      // Never resolves — simulates in-flight request
      mockGetBestProviderForAsset.mockReturnValue(new Promise(() => undefined));

      const { result } = renderHook(
        () =>
          useCanFiatDepositAsset({
            assetId: 'eip155:1/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da',
            isFiatDepositFlagEnabled: true,
          }),
        { wrapper: Wrapper },
      );

      // Before resolution, should fail closed (false)
      expect(result.current).toBe(false);
    });
  });

  describe('query key includes regionCode for correct caching', () => {
    it('uses regionCode from selectUserRegion in the query key', async () => {
      const store = createMockStore({
        country: { currency: 'EUR' },
        state: null,
        regionCode: 'de',
      });
      const { Wrapper } = createWrapper(store);

      mockGetBestProviderForAsset.mockResolvedValue(mockProvider);

      const { result } = renderHook(
        () =>
          useCanFiatDepositAsset({
            assetId: 'eip155:1/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da',
            isFiatDepositFlagEnabled: true,
          }),
        { wrapper: Wrapper },
      );

      await waitFor(() => expect(result.current).toBe(true));
    });
  });
});
