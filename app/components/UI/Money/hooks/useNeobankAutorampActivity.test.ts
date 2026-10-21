import { AutorampStatus } from '@metamask/ramps-controller';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useSelector } from 'react-redux';
import { useIsFocused } from '@react-navigation/native';
import { useNetworkTierState } from '../../../../hooks/useNetworkTier';
import { selectMoneyVbaPendingActivityEnabled } from '../selectors/featureFlags';
import { selectSelectedVbaWalletAddress } from '../../../../selectors/rampsController';
import { getHardwareTier } from '../../../../util/deviceCapability';
import {
  useNeobankAutorampActivity,
  findUsableAutorampForActivity,
} from './useNeobankAutorampActivity';
import Engine from '../../../../core/Engine';

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

const mockUseSelector = jest.mocked(useSelector);
const mockUseIsFocused = jest.mocked(useIsFocused);
const mockUseNetworkTierState = jest.mocked(useNetworkTierState);
const mockGetHardwareTier = jest.mocked(getHardwareTier);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: React.PropsWithChildren) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

function setupPollingHook(enabled = true) {
  mockUseSelector.mockImplementation((selector: unknown) => {
    if (selector === selectMoneyVbaPendingActivityEnabled) return enabled;
    if (selector === selectSelectedVbaWalletAddress) return '0xwallet';
    if (typeof selector !== 'function') return undefined;
    return [
      {
        id: 'ar-1',
        walletAddress: '0xwallet',
        status: AutorampStatus.Approved,
      },
    ];
  });
  mockUseIsFocused.mockReturnValue(true);
  mockUseNetworkTierState.mockReturnValue({ tier: 'WIFI', isResolved: true });
  mockGetHardwareTier.mockReturnValue('MID');
}

describe('findUsableAutorampForActivity', () => {
  const money = '0xMoneyAccount';
  const other = '0xOther';

  it('prefers an autoramp matching the Money Account wallet', () => {
    const matched = {
      id: 'ar-money',
      walletAddress: money,
      status: AutorampStatus.Approved,
    };
    const otherAr = {
      id: 'ar-other',
      walletAddress: other,
      status: AutorampStatus.Approved,
    };

    expect(
      findUsableAutorampForActivity([otherAr, matched] as never, [money])?.id,
    ).toBe('ar-money');
  });

  it('does not fall back to an unmatched autoramp (stale post-reset cursors)', () => {
    const stale = {
      id: 'ar-stale',
      walletAddress: other,
      status: AutorampStatus.Approved,
      updatedAt: 99,
    };

    expect(
      findUsableAutorampForActivity([stale] as never, [money]),
    ).toBeUndefined();
  });

  it('returns undefined when no wallet addresses are provided', () => {
    expect(
      findUsableAutorampForActivity(
        [
          {
            id: 'ar-1',
            walletAddress: money,
            status: AutorampStatus.Approved,
          },
        ] as never,
        [null, undefined, ''],
      ),
    ).toBeUndefined();
  });

  it('skips Rejected and Cancelled autoramps', () => {
    expect(
      findUsableAutorampForActivity(
        [
          {
            id: 'ar-rejected',
            walletAddress: money,
            status: AutorampStatus.Rejected,
          },
          {
            id: 'ar-cancelled',
            walletAddress: money,
            status: AutorampStatus.Cancelled,
          },
        ] as never,
        [money],
      ),
    ).toBeUndefined();
  });
});

describe('useNeobankAutorampActivity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shares the polling subscription across mounted consumers', async () => {
    jest.useFakeTimers();
    setupPollingHook();
    const listAutorampTransactions = jest
      .fn()
      .mockResolvedValue([
        { id: 'tx-1', autorampId: 'ar-1', status: 'Pending' },
      ]);
    (Engine.context as unknown as { NeoBankService: unknown }).NeoBankService =
      {
        listAutorampTransactions,
      };
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      value: 'active',
    });
    const wrapper = createWrapper();
    const first = renderHook(() => useNeobankAutorampActivity('0xwallet'), {
      wrapper,
    });
    const second = renderHook(() => useNeobankAutorampActivity('0xwallet'), {
      wrapper,
    });

    await waitFor(() => {
      expect(listAutorampTransactions).toHaveBeenCalledTimes(1);
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(10_000);
    });
    expect(listAutorampTransactions).toHaveBeenCalledTimes(2);

    first.unmount();
    second.unmount();
    jest.useRealTimers();
  });

  it('does not poll with feature flag disabled', () => {
    jest.useFakeTimers();
    setupPollingHook(false);
    const listAutorampTransactions = jest.fn();
    (Engine.context as unknown as { NeoBankService: unknown }).NeoBankService =
      {
        listAutorampTransactions,
      };
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      value: 'active',
    });
    const { unmount } = renderHook(
      () => useNeobankAutorampActivity('0xwallet'),
      { wrapper: createWrapper() },
    );

    jest.advanceTimersByTime(20_000);
    expect(listAutorampTransactions).not.toHaveBeenCalled();
    unmount();
    jest.useRealTimers();
  });
});
