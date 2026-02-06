import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import {
  useNavigation,
  useRoute,
  StackActions,
} from '@react-navigation/native';
import PerpsOrderRedirect from './PerpsOrderRedirect';
import { usePerpsConnection } from '../hooks/usePerpsConnection';
import { usePerpsTrading } from '../hooks/usePerpsTrading';
import usePerpsToasts from '../hooks/usePerpsToasts';
import Routes from '../../../../constants/navigation/Routes';
import { CONFIRMATION_HEADER_CONFIG } from '../constants/perpsConfig';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
  StackActions: {
    replace: jest.fn(),
  },
}));

jest.mock('../hooks/usePerpsConnection', () => ({
  usePerpsConnection: jest.fn(),
}));

jest.mock('../hooks/usePerpsTrading', () => ({
  usePerpsTrading: jest.fn(),
}));

jest.mock('../hooks/usePerpsToasts', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const MockPerpsLoader = jest.fn(() => null);
jest.mock('../components/PerpsLoader', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => MockPerpsLoader(props),
}));

jest.mock('../../../../util/Logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../../../../util/errorUtils', () => ({
  ensureError: jest.fn((e) => (e instanceof Error ? e : new Error(String(e)))),
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockDispatch = jest.fn();
const mockDepositWithOrder = jest.fn();
const mockShowToast = jest.fn();
const mockToastOptions = {
  accountManagement: {
    oneClickTrade: {
      txCreationFailed: { variant: 'error', label: 'Failed' },
    },
  },
};

const mockUseNavigation = jest.mocked(useNavigation);
const mockUseRoute = jest.mocked(useRoute);
const mockUsePerpsConnection = jest.mocked(usePerpsConnection);
const mockUsePerpsTrading = jest.mocked(usePerpsTrading);
const mockUsePerpsToasts = jest.mocked(usePerpsToasts);

describe('PerpsOrderRedirect', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
      goBack: mockGoBack,
      dispatch: mockDispatch,
    } as never);

    mockUseRoute.mockReturnValue({
      key: 'test',
      name: 'PerpsOrderRedirect',
      params: { direction: 'long', asset: 'ETH' },
    } as never);

    mockUsePerpsTrading.mockReturnValue({
      depositWithOrder: mockDepositWithOrder,
    } as never);

    mockUsePerpsToasts.mockReturnValue({
      showToast: mockShowToast,
      PerpsToastOptions: mockToastOptions,
    } as never);
  });

  it('renders loader with preparing message', () => {
    // Arrange
    mockUsePerpsConnection.mockReturnValue({
      isConnected: false,
      isInitialized: false,
    } as never);

    // Act
    render(<PerpsOrderRedirect />);

    // Assert
    expect(MockPerpsLoader).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Preparing order...',
        fullScreen: true,
      }),
    );
  });

  it('does not call depositWithOrder when WebSocket is not ready', () => {
    // Arrange
    mockUsePerpsConnection.mockReturnValue({
      isConnected: false,
      isInitialized: false,
    } as never);

    // Act
    render(<PerpsOrderRedirect />);

    // Assert
    expect(mockDepositWithOrder).not.toHaveBeenCalled();
  });

  it('calls depositWithOrder and navigates to confirmation on success', async () => {
    // Arrange
    mockUsePerpsConnection.mockReturnValue({
      isConnected: true,
      isInitialized: true,
    } as never);

    mockDepositWithOrder.mockResolvedValue(undefined);

    const mockReplaceAction = { type: 'REPLACE' };
    (StackActions.replace as jest.Mock).mockReturnValue(mockReplaceAction);

    // Act
    render(<PerpsOrderRedirect />);

    // Assert
    await waitFor(() => {
      expect(mockDepositWithOrder).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(StackActions.replace).toHaveBeenCalledWith(
        Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
        {
          direction: 'long',
          asset: 'ETH',
          showPerpsHeader:
            CONFIRMATION_HEADER_CONFIG.ShowPerpsHeaderForDepositAndTrade,
        },
      );
      expect(mockDispatch).toHaveBeenCalledWith(mockReplaceAction);
    });
  });

  it('shows toast and goes back on depositWithOrder failure', async () => {
    // Arrange
    mockUsePerpsConnection.mockReturnValue({
      isConnected: true,
      isInitialized: true,
    } as never);

    mockDepositWithOrder.mockRejectedValue(new Error('Order failed'));

    // Act
    render(<PerpsOrderRedirect />);

    // Assert
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        mockToastOptions.accountManagement.oneClickTrade.txCreationFailed,
      );
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  it('uses short direction from route params', async () => {
    // Arrange
    mockUseRoute.mockReturnValue({
      key: 'test',
      name: 'PerpsOrderRedirect',
      params: { direction: 'short', asset: 'BTC' },
    } as never);

    mockUsePerpsConnection.mockReturnValue({
      isConnected: true,
      isInitialized: true,
    } as never);

    mockDepositWithOrder.mockResolvedValue(undefined);

    const mockReplaceAction = { type: 'REPLACE' };
    (StackActions.replace as jest.Mock).mockReturnValue(mockReplaceAction);

    // Act
    render(<PerpsOrderRedirect />);

    // Assert
    await waitFor(() => {
      expect(StackActions.replace).toHaveBeenCalledWith(
        Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
        expect.objectContaining({
          direction: 'short',
          asset: 'BTC',
        }),
      );
    });
  });

  it('does not call depositWithOrder twice on re-render', async () => {
    // Arrange
    mockUsePerpsConnection.mockReturnValue({
      isConnected: true,
      isInitialized: true,
    } as never);

    mockDepositWithOrder.mockResolvedValue(undefined);
    (StackActions.replace as jest.Mock).mockReturnValue({ type: 'REPLACE' });

    // Act
    const { rerender } = render(<PerpsOrderRedirect />);
    rerender(<PerpsOrderRedirect />);

    // Assert
    await waitFor(() => {
      expect(mockDepositWithOrder).toHaveBeenCalledTimes(1);
    });
  });
});
