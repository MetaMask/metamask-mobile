import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { type Provider as RampProvider } from '@metamask/ramps-controller';
import {
  useProviderPickerOptions,
  usePreviouslyUsedProviderIds,
} from './useProviderPickerOptions';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../constants/on-ramp';

const mockAheadOfHistory = ['crossmint'];
jest.mock(
  '../../../../selectors/featureFlagController/rampsProvidersAheadOfHistory',
  () => ({
    selectRampsProvidersAheadOfHistory: () => mockAheadOfHistory,
  }),
);

const makeProvider = (id: string, type?: string) =>
  ({ id, name: id, type }) as unknown as RampProvider;

const providers = [
  makeProvider('transak-native', 'native'),
  makeProvider('paypal'),
  makeProvider('moonpay'),
];

const legacyOrder = (overrides: Record<string, unknown>) => ({
  state: FIAT_ORDER_STATES.COMPLETED,
  orderType: 'BUY',
  ...overrides,
});

const legacyOrders = [
  legacyOrder({
    provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
    createdAt: 100,
    data: { provider: { id: '/providers/moonpay' } },
  }),
  legacyOrder({ provider: FIAT_ORDER_PROVIDERS.DEPOSIT, createdAt: 200 }),
  legacyOrder({
    provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
    createdAt: 300,
    orderType: 'SELL',
    data: { provider: { id: '/providers/paypal' } },
  }),
  legacyOrder({
    provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
    createdAt: 400,
    state: FIAT_ORDER_STATES.FAILED,
    data: { provider: { id: '/providers/paypal' } },
  }),
];

const wrapper =
  (orders: unknown[] = []) =>
  ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      Provider,
      {
        store: configureStore({
          reducer: {
            engine: () => ({
              backgroundState: { RampsController: { orders } },
            }),
            fiatOrders: () => ({ orders: legacyOrders }),
          },
        }),
      } as never,
      children,
    );

describe('useProviderPickerOptions', () => {
  it('returns the flag list and completed legacy buys, with Deposit mapped to the native provider', () => {
    const { result } = renderHook(() => useProviderPickerOptions(providers), {
      wrapper: wrapper(),
    });

    expect(result.current).toStrictEqual({
      aheadOfHistory: ['crossmint'],
      extraHistory: [
        { providerId: '/providers/moonpay', completedAt: 100 },
        { providerId: 'transak-native', completedAt: 200 },
      ],
    });
  });

  it('drops legacy Deposit orders when the region has no native provider', () => {
    const { result } = renderHook(
      () => useProviderPickerOptions(providers.slice(1)),
      { wrapper: wrapper() },
    );

    expect(result.current.extraHistory).toStrictEqual([
      { providerId: '/providers/moonpay', completedAt: 100 },
    ]);
  });
});

describe('usePreviouslyUsedProviderIds', () => {
  it('returns ids of providers with completed buys from controller and legacy orders, newest first', () => {
    const controllerOrders = [
      {
        provider: { id: '/providers/paypal' },
        status: 'COMPLETED',
        orderType: 'BUY',
        createdAt: '1970-01-01T00:00:00.150Z',
      },
      {
        provider: { id: 'moonpay' },
        status: 'PENDING',
        orderType: 'BUY',
        createdAt: 999,
      },
    ];

    const { result } = renderHook(
      () => usePreviouslyUsedProviderIds(providers),
      { wrapper: wrapper(controllerOrders) },
    );

    expect(result.current).toStrictEqual([
      'transak-native',
      'paypal',
      'moonpay',
    ]);
  });
});
