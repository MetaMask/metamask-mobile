import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useSelector } from 'react-redux';
import { useIsFocused } from '@react-navigation/native';
import { useNetworkTierState } from '../../../../hooks/useNetworkTier';
import { getHardwareTier } from '../../../../util/deviceCapability';
import Logger from '../../../../util/Logger';
import Engine from '../../../../core/Engine';
import { selectMoneyMicrodepositsEnabled } from '../selectors/featureFlags';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { useMoneyMicrodeposits } from './useMoneyMicrodeposits';

jest.mock('../../../../core/Engine', () => ({ context: {} }));
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useIsFocused: jest.fn(),
}));
jest.mock('../../../../hooks/useNetworkTier', () => ({
  useNetworkTierState: jest.fn(),
}));
jest.mock('../../../../util/deviceCapability', () => ({
  getHardwareTier: jest.fn(),
}));
jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

const mockUseSelector = jest.mocked(useSelector);
const mockUseIsFocused = jest.mocked(useIsFocused);
const mockUseNetworkTierState = jest.mocked(useNetworkTierState);
const mockGetHardwareTier = jest.mocked(getHardwareTier);
const mockLoggerError = jest.mocked(Logger.error);

const ADDRESS = '0xbF4bC559f929cE3994Ba12D71d564737357bC8C2';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: React.PropsWithChildren) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

function setup(
  options: {
    enabled?: boolean;
    address?: string | undefined;
    tier?: 'WIFI' | 'SLOW_CELLULAR' | 'NONE';
  } = {},
) {
  const enabled = options.enabled ?? true;
  const address = Object.hasOwn(options, 'address') ? options.address : ADDRESS;
  const tier = options.tier ?? 'WIFI';
  mockUseSelector.mockImplementation((selector: unknown) => {
    if (selector === selectMoneyMicrodepositsEnabled) return enabled;
    if (selector === selectPrimaryMoneyAccount) {
      return address ? { address } : undefined;
    }
    return undefined;
  });
  mockUseIsFocused.mockReturnValue(true);
  mockUseNetworkTierState.mockReturnValue({ tier, isResolved: true } as never);
  mockGetHardwareTier.mockReturnValue('MID');
}

function setService(service: unknown) {
  (Engine.context as unknown as Record<string, unknown>).NeoBankService =
    service;
}

describe('useMoneyMicrodeposits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setup();
  });

  it('maps the proxy response into activity rows, newest first', async () => {
    const getMicrodeposits = jest.fn().mockResolvedValue([
      {
        amount: '0.11',
        currency_code: 'USD',
        created_at: '2026-10-20T00:00:00.000Z',
      },
      {
        amount: '0.34',
        currency_code: 'USD',
        created_at: '2026-10-27T00:00:00.000Z',
      },
    ]);
    setService({ getMicrodeposits });

    const { result } = renderHook(() => useMoneyMicrodeposits(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(getMicrodeposits).toHaveBeenCalledTimes(1);
    expect(result.current.microdeposits.map((row) => row.amount)).toEqual([
      '0.34',
      '0.11',
    ]);
  });

  it('returns an empty list when the pinned controller cannot serve microdeposits', async () => {
    setService({});

    const { result } = renderHook(() => useMoneyMicrodeposits(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.microdeposits).toEqual([]);
  });

  it('swallows a failed fetch and logs it', async () => {
    const getMicrodeposits = jest
      .fn()
      .mockRejectedValue(new Error('upstream down'));
    setService({ getMicrodeposits });

    const { result } = renderHook(() => useMoneyMicrodeposits(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(getMicrodeposits).toHaveBeenCalled());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.microdeposits).toEqual([]);
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('does not fetch while the feature flag is off', async () => {
    setup({ enabled: false });
    const getMicrodeposits = jest.fn();
    setService({ getMicrodeposits });

    const { result } = renderHook(() => useMoneyMicrodeposits(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(getMicrodeposits).not.toHaveBeenCalled();
  });

  it('does not fetch without a Money Account address', async () => {
    setup({ address: undefined });
    const getMicrodeposits = jest.fn();
    setService({ getMicrodeposits });

    const { result } = renderHook(() => useMoneyMicrodeposits(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(getMicrodeposits).not.toHaveBeenCalled();
  });

  it('does not fetch while the network is known to be offline', async () => {
    setup({ tier: 'NONE' });
    const getMicrodeposits = jest.fn();
    setService({ getMicrodeposits });

    const { result } = renderHook(() => useMoneyMicrodeposits(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(getMicrodeposits).not.toHaveBeenCalled();
  });
});
