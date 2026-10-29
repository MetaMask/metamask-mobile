import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useSelector } from 'react-redux';
import { useIsFocused } from '@react-navigation/native';
import { useNetworkTierState } from '../../../../hooks/useNetworkTier';
import Logger from '../../../../util/Logger';
import Engine from '../../../../core/Engine';
import { useMoneyMicrodeposits } from './useMoneyMicrodeposits';
import { selectKycSessionStatus } from '../../../../selectors/kycController';

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
jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));
jest.mock('../../../../selectors/kycController', () => ({
  selectKycSessionStatus: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);
const mockUseIsFocused = jest.mocked(useIsFocused);
const mockUseNetworkTierState = jest.mocked(useNetworkTierState);
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
    address?: string | undefined;
    tier?: 'WIFI' | 'SLOW_CELLULAR' | 'NONE';
    kycApproved?: boolean;
    registeredWallet?: string;
    autorampWallet?: string;
    locked?: boolean;
  } = {},
) {
  const address = Object.hasOwn(options, 'address') ? options.address : ADDRESS;
  const tier = options.tier ?? 'WIFI';
  const kycApproved = options.kycApproved ?? false;
  const isUnlocked = !(options.locked ?? false);
  const sessionStatus = kycApproved
    ? { finalStatus: 'approved', kycStatus: 'approved' }
    : null;
  const rampsState = {
    moneyAccountWalletRegistrations: options.registeredWallet
      ? [{ walletAddress: options.registeredWallet }]
      : [],
    autoramps: options.autorampWallet
      ? [{ id: 'ar-1', walletAddress: options.autorampWallet }]
      : [],
  };
  mockUseSelector.mockImplementation((selector: unknown) => {
    if (selector === selectKycSessionStatus) {
      return sessionStatus;
    }
    if (typeof selector === 'function') {
      return (selector as (state: unknown) => unknown)({
        engine: {
          backgroundState: {
            KeyringController: { isUnlocked },
            RampsController: rampsState,
          },
        },
      });
    }
    return undefined;
  });
  mockUseIsFocused.mockReturnValue(true);
  mockUseNetworkTierState.mockReturnValue({ tier, isResolved: true } as never);
  return address;
}

function renderMicrodeposits(address: string | undefined) {
  return renderHook(() => useMoneyMicrodeposits(address), {
    wrapper: createWrapper(),
  });
}

function setService(service: unknown) {
  (Engine.context as unknown as Record<string, unknown>).NeoBankService =
    service;
}

describe('useMoneyMicrodeposits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setup({ kycApproved: true });
  });

  it('maps the proxy response into activity rows, newest first', async () => {
    const address = setup({ kycApproved: true });
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

    const { result } = renderMicrodeposits(address);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(getMicrodeposits).toHaveBeenCalledTimes(1);
    expect(result.current.microdeposits.map((row) => row.amount)).toEqual([
      '0.34',
      '0.11',
    ]);
  });

  it('returns an empty list when the proxy has no microdeposits', async () => {
    const address = setup({ kycApproved: true });
    setService({ getMicrodeposits: jest.fn().mockResolvedValue([]) });

    const { result } = renderMicrodeposits(address);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.microdeposits).toEqual([]);
  });

  it('logs a failed first fetch and shows no rows', async () => {
    const address = setup({ kycApproved: true });
    const getMicrodeposits = jest
      .fn()
      .mockRejectedValue(new Error('upstream down'));
    setService({ getMicrodeposits });

    const { result } = renderMicrodeposits(address);

    await waitFor(() => expect(getMicrodeposits).toHaveBeenCalled());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.microdeposits).toEqual([]);
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('keeps the last good rows when a later poll fails', async () => {
    const address = setup({ kycApproved: true });
    const getMicrodeposits = jest
      .fn()
      .mockResolvedValueOnce([
        {
          amount: '0.34',
          currency_code: 'USD',
          created_at: '2026-10-27T00:00:00.000Z',
        },
      ])
      .mockRejectedValueOnce(new Error('upstream down'));
    setService({ getMicrodeposits });

    const { result } = renderMicrodeposits(address);

    await waitFor(() => expect(result.current.microdeposits).toHaveLength(1));

    result.current.refetch();

    await waitFor(() => expect(mockLoggerError).toHaveBeenCalled());

    expect(result.current.microdeposits).toHaveLength(1);
    expect(result.current.microdeposits[0].amount).toBe('0.34');
  });

  it.each([
    ['an approved KYC decision', { kycApproved: true }],
    [
      'a wallet registration with no KYC session',
      { registeredWallet: ADDRESS },
    ],
    [
      'an autoramp with no KYC session',
      { autorampWallet: ADDRESS.toLowerCase() },
    ],
  ])('fetches with %s', async (_label, options) => {
    const address = setup(options as Parameters<typeof setup>[0]);

    const getMicrodeposits = jest.fn().mockResolvedValue([]);
    setService({ getMicrodeposits });

    const { result } = renderMicrodeposits(address);

    await waitFor(() => expect(getMicrodeposits).toHaveBeenCalled());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('does not fetch for a wallet with no KYC decision and no VBA evidence', async () => {
    const address = setup();
    const getMicrodeposits = jest.fn();
    setService({ getMicrodeposits });

    const { result } = renderMicrodeposits(address);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(getMicrodeposits).not.toHaveBeenCalled();
  });

  it('does not fetch without a Money Account address', async () => {
    const address = setup({ address: undefined, kycApproved: true });
    const getMicrodeposits = jest.fn();
    setService({ getMicrodeposits });

    const { result } = renderMicrodeposits(address);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(getMicrodeposits).not.toHaveBeenCalled();
  });

  it('does not fetch while the network is known to be offline', async () => {
    const address = setup({ tier: 'NONE', kycApproved: true });
    const getMicrodeposits = jest.fn();
    setService({ getMicrodeposits });

    const { result } = renderMicrodeposits(address);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(getMicrodeposits).not.toHaveBeenCalled();
  });

  it('does not fetch while the wallet is locked', async () => {
    const address = setup({ kycApproved: true, locked: true });
    const getMicrodeposits = jest.fn();
    setService({ getMicrodeposits });

    const { result } = renderMicrodeposits(address);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(getMicrodeposits).not.toHaveBeenCalled();
  });

  it('does not refetch when the gate is closed', async () => {
    const address = setup();
    const getMicrodeposits = jest.fn();
    setService({ getMicrodeposits });

    const { result } = renderMicrodeposits(address);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    result.current.refetch();

    expect(getMicrodeposits).not.toHaveBeenCalled();
  });
});
