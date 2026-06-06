import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useMoneyAccountDepositPaymentMethods } from './useMoneyAccountDepositPaymentMethods';
import { MONEY_ACCOUNT_FIAT_DEPOSIT_ASSET_ID } from '../../../../UI/Ramp/utils/getMoneyAccountFiatDepositAssetId';
import Engine from '../../../../../core/Engine';

jest.mock('../../../../../core/Engine', () => ({
  context: {
    RampsController: {
      getBestProviderForAsset: jest.fn(),
      getPaymentMethods: jest.fn(),
    },
  },
}));

const mockGetBestProviderForAsset = Engine.context.RampsController
  .getBestProviderForAsset as jest.Mock;
const mockGetPaymentMethods = Engine.context.RampsController
  .getPaymentMethods as jest.Mock;

const PROVIDER_ID = 'test-provider';
const PAYMENT_METHOD = {
  id: '/payments/debit-credit-card',
  name: 'Debit Card',
  delay: [0, 5],
};

const createMockStore = (
  userRegion: {
    country: { currency: string } | null;
    state: null;
    regionCode: string;
  } | null = {
    country: { currency: 'EUR' },
    state: null,
    regionCode: 'de',
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

describe('useMoneyAccountDepositPaymentMethods', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('provider query enabled-gating', () => {
    it('does not call getBestProviderForAsset when there is no regionCode', () => {
      const store = createMockStore({
        country: { currency: 'EUR' },
        state: null,
        regionCode: '',
      });
      const { Wrapper } = createWrapper(store);

      renderHook(() => useMoneyAccountDepositPaymentMethods(), {
        wrapper: Wrapper,
      });

      expect(mockGetBestProviderForAsset).not.toHaveBeenCalled();
    });

    it('does not call getBestProviderForAsset when userRegion is null', () => {
      const store = createMockStore(null);
      const { Wrapper } = createWrapper(store);

      renderHook(() => useMoneyAccountDepositPaymentMethods(), {
        wrapper: Wrapper,
      });

      expect(mockGetBestProviderForAsset).not.toHaveBeenCalled();
    });

    it('calls getBestProviderForAsset when a regionCode is present', async () => {
      const store = createMockStore();
      const { Wrapper } = createWrapper(store);

      mockGetBestProviderForAsset.mockResolvedValue(null);

      renderHook(() => useMoneyAccountDepositPaymentMethods(), {
        wrapper: Wrapper,
      });

      await waitFor(() =>
        expect(mockGetBestProviderForAsset).toHaveBeenCalled(),
      );
    });
  });

  describe('assetId fallback', () => {
    it('uses MONEY_ACCOUNT_FIAT_DEPOSIT_ASSET_ID when no caipAssetId is provided', async () => {
      const store = createMockStore();
      const { Wrapper } = createWrapper(store);

      mockGetBestProviderForAsset.mockResolvedValue(null);

      renderHook(() => useMoneyAccountDepositPaymentMethods(), {
        wrapper: Wrapper,
      });

      await waitFor(() =>
        expect(mockGetBestProviderForAsset).toHaveBeenCalledWith({
          assetId: MONEY_ACCOUNT_FIAT_DEPOSIT_ASSET_ID,
        }),
      );
    });

    it('uses the provided caipAssetId when present', async () => {
      const store = createMockStore();
      const { Wrapper } = createWrapper(store);

      mockGetBestProviderForAsset.mockResolvedValue(null);

      const customAssetId = 'eip155:1/erc20:0xCustomToken';

      renderHook(() => useMoneyAccountDepositPaymentMethods(customAssetId), {
        wrapper: Wrapper,
      });

      await waitFor(() =>
        expect(mockGetBestProviderForAsset).toHaveBeenCalledWith({
          assetId: customAssetId,
        }),
      );
    });
  });

  describe('payment-methods query enabled-gating', () => {
    it('does not fetch payment methods until a provider resolves', async () => {
      const store = createMockStore();
      const { Wrapper } = createWrapper(store);

      // Provider resolves to null (no provider for region)
      mockGetBestProviderForAsset.mockResolvedValue(null);

      renderHook(() => useMoneyAccountDepositPaymentMethods(), {
        wrapper: Wrapper,
      });

      await waitFor(() =>
        expect(mockGetBestProviderForAsset).toHaveBeenCalled(),
      );

      expect(mockGetPaymentMethods).not.toHaveBeenCalled();
    });

    it('fetches payment methods for the resolved provider', async () => {
      const store = createMockStore();
      const { Wrapper } = createWrapper(store);

      mockGetBestProviderForAsset.mockResolvedValue({ id: PROVIDER_ID });
      mockGetPaymentMethods.mockResolvedValue({ payments: [PAYMENT_METHOD] });

      renderHook(() => useMoneyAccountDepositPaymentMethods(), {
        wrapper: Wrapper,
      });

      await waitFor(() => expect(mockGetPaymentMethods).toHaveBeenCalled());

      expect(mockGetPaymentMethods).toHaveBeenCalledWith('de', {
        fiat: 'EUR',
        assetId: MONEY_ACCOUNT_FIAT_DEPOSIT_ASSET_ID,
        provider: PROVIDER_ID,
      });
    });
  });

  describe('isReady semantics', () => {
    it('is false when no provider resolves', async () => {
      const store = createMockStore();
      const { Wrapper } = createWrapper(store);

      mockGetBestProviderForAsset.mockResolvedValue(null);

      const { result } = renderHook(
        () => useMoneyAccountDepositPaymentMethods(),
        { wrapper: Wrapper },
      );

      await waitFor(() =>
        expect(mockGetBestProviderForAsset).toHaveBeenCalled(),
      );

      expect(result.current.isReady).toBe(false);
      expect(result.current.paymentMethods).toEqual([]);
    });

    it('is true with the methods once provider resolves AND payment-methods query succeeds', async () => {
      const store = createMockStore();
      const { Wrapper } = createWrapper(store);

      mockGetBestProviderForAsset.mockResolvedValue({ id: PROVIDER_ID });
      mockGetPaymentMethods.mockResolvedValue({ payments: [PAYMENT_METHOD] });

      const { result } = renderHook(
        () => useMoneyAccountDepositPaymentMethods(),
        { wrapper: Wrapper },
      );

      await waitFor(() => expect(result.current.isReady).toBe(true));

      expect(result.current.paymentMethods).toEqual([PAYMENT_METHOD]);
    });

    it('is true with an empty list when the provider returns zero payment methods', async () => {
      const store = createMockStore();
      const { Wrapper } = createWrapper(store);

      mockGetBestProviderForAsset.mockResolvedValue({ id: PROVIDER_ID });
      mockGetPaymentMethods.mockResolvedValue({ payments: [] });

      const { result } = renderHook(
        () => useMoneyAccountDepositPaymentMethods(),
        { wrapper: Wrapper },
      );

      await waitFor(() => expect(result.current.isReady).toBe(true));

      expect(result.current.paymentMethods).toEqual([]);
    });
  });
});
