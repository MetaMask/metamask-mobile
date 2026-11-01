import { renderHook, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { AutorampStatus } from '@metamask/ramps-controller';
import Engine from '../../../../core/Engine';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import {
  selectRampsAutoramps,
  selectSelectedVbaWalletAddress,
} from '../../../../selectors/rampsController';
import Logger from '../../../../util/Logger';
import { useVbaTransactionRefresh } from './useVbaTransactionRefresh';

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      RampsController: {
        refreshAutorampTransactions: jest.fn(),
      },
    },
  },
}));
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
  useIsFocused: jest.fn(),
}));
jest.mock('../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: jest.fn(),
}));
jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

const mockUseSelector = jest.mocked(useSelector);
const mockUseFocusEffect = jest.mocked(useFocusEffect);
const mockUseIsFocused = jest.mocked(useIsFocused);
const mockUseNetworkTier = jest.mocked(useNetworkTier);
const mockRefreshAutorampTransactions = jest.mocked(
  Engine.context.RampsController.refreshAutorampTransactions,
);
const mockLoggerError = jest.mocked(Logger.error);

const WALLET = '0xWallet';

const makeAutoramp = (overrides: Record<string, unknown> = {}): never =>
  ({
    id: 'ar-1',
    walletAddress: WALLET,
    status: AutorampStatus.Approved,
    ...overrides,
  }) as never;

let appStateListeners: ((state: string) => void)[] = [];

function setupSelectors({
  walletAddress = WALLET as string | null,
  autoramps = [makeAutoramp()] as never[],
} = {}) {
  mockUseSelector.mockImplementation((selector: unknown) => {
    if (selector === selectSelectedVbaWalletAddress) {
      return walletAddress;
    }
    if (selector === selectRampsAutoramps) {
      return autoramps;
    }
    return undefined;
  });
}

describe('useVbaTransactionRefresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    appStateListeners = [];
    mockUseFocusEffect.mockImplementation((callback) => callback());
    mockUseIsFocused.mockReturnValue(true);
    mockUseNetworkTier.mockReturnValue('WIFI');
    mockRefreshAutorampTransactions.mockResolvedValue([]);
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_event, handler) => {
        appStateListeners.push(handler as (state: string) => void);
        return { remove: jest.fn() } as never;
      });
    setupSelectors();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('refreshes the approved autoramp that matches the selected VBA wallet', () => {
    renderHook(() => useVbaTransactionRefresh());

    expect(mockRefreshAutorampTransactions).toHaveBeenCalledTimes(1);
    expect(mockRefreshAutorampTransactions).toHaveBeenCalledWith('ar-1');
  });

  it('skips autoramps that are Rejected or Cancelled', () => {
    setupSelectors({
      autoramps: [
        makeAutoramp({ id: 'ar-rejected', status: AutorampStatus.Rejected }),
        makeAutoramp({ id: 'ar-cancelled', status: AutorampStatus.Cancelled }),
      ],
    });

    renderHook(() => useVbaTransactionRefresh());

    expect(mockRefreshAutorampTransactions).not.toHaveBeenCalled();
  });

  it('does not fall back to an unmatched autoramp', () => {
    setupSelectors({
      autoramps: [makeAutoramp({ walletAddress: '0xOther' })],
    });

    renderHook(() => useVbaTransactionRefresh());

    expect(mockRefreshAutorampTransactions).not.toHaveBeenCalled();
  });

  it('skips when there is no selected VBA wallet', () => {
    setupSelectors({ walletAddress: null });

    renderHook(() => useVbaTransactionRefresh());

    expect(mockRefreshAutorampTransactions).not.toHaveBeenCalled();
  });

  it('skips network work on a known-offline network', () => {
    mockUseNetworkTier.mockReturnValue('NONE');

    renderHook(() => useVbaTransactionRefresh());

    expect(mockRefreshAutorampTransactions).not.toHaveBeenCalled();
  });

  it('does nothing when the installed controller has no refresh method', () => {
    const controller = Engine.context.RampsController as {
      refreshAutorampTransactions?: (autorampId: string) => Promise<unknown>;
    };
    const original = controller.refreshAutorampTransactions;
    delete controller.refreshAutorampTransactions;

    try {
      renderHook(() => useVbaTransactionRefresh());
      expect(mockRefreshAutorampTransactions).not.toHaveBeenCalled();
    } finally {
      controller.refreshAutorampTransactions = original;
    }
  });

  it('refreshes when the app returns to the foreground while focused', () => {
    renderHook(() => useVbaTransactionRefresh());
    mockRefreshAutorampTransactions.mockClear();

    appStateListeners.forEach((listener) => listener('active'));

    expect(mockRefreshAutorampTransactions).toHaveBeenCalledTimes(1);
    expect(mockRefreshAutorampTransactions).toHaveBeenCalledWith('ar-1');
  });

  it('does not refresh on foreground when the screen is not focused', () => {
    mockUseIsFocused.mockReturnValue(false);

    renderHook(() => useVbaTransactionRefresh());
    mockRefreshAutorampTransactions.mockClear();

    appStateListeners.forEach((listener) => listener('active'));

    expect(mockRefreshAutorampTransactions).not.toHaveBeenCalled();
  });

  it('does not refresh on background transitions', () => {
    renderHook(() => useVbaTransactionRefresh());
    mockRefreshAutorampTransactions.mockClear();

    appStateListeners.forEach((listener) => listener('background'));

    expect(mockRefreshAutorampTransactions).not.toHaveBeenCalled();
  });

  it('logs a failed refresh without throwing', async () => {
    const error = new Error('refresh failed');
    mockRefreshAutorampTransactions.mockRejectedValue(error);

    renderHook(() => useVbaTransactionRefresh());

    await waitFor(() => {
      expect(mockLoggerError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          context: expect.objectContaining({
            name: 'useVbaTransactionRefresh',
          }),
        }),
      );
    });
  });
});
