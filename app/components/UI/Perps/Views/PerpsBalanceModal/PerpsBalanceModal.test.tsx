import { useNavigation } from '@react-navigation/native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import PerpsBalanceModal from './PerpsBalanceModal';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

// Mock hooks
jest.mock('../../hooks', () => ({
  usePerpsTrading: jest.fn(),
  usePerpsNetworkManagement: jest.fn(),
}));

describe('PerpsBalanceModal', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
  };

  const mockUsePerpsTrading = jest.requireMock('../../hooks').usePerpsTrading;
  const mockUsePerpsNetworkManagement =
    jest.requireMock('../../hooks').usePerpsNetworkManagement;

  // Helper function to render component with required providers
  const renderWithProviders = (component: React.ReactElement) =>
    render(
      <SafeAreaProvider
        initialMetrics={{
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
          frame: { x: 0, y: 0, width: 0, height: 0 },
        }}
      >
        {component}
      </SafeAreaProvider>,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);

    mockUsePerpsTrading.mockReturnValue({
      depositWithConfirmation: jest.fn().mockResolvedValue({
        result: Promise.resolve(),
      }),
    });

    mockUsePerpsNetworkManagement.mockReturnValue({
      ensureArbitrumNetworkExists: jest.fn().mockResolvedValue(undefined),
    });
  });

  describe('Component Rendering', () => {
    it('renders correctly with all buttons and title', () => {
      renderWithProviders(<PerpsBalanceModal />);

      expect(
        screen.getByText(strings('perps.manage_balance')),
      ).toBeOnTheScreen();
      expect(screen.getByText(strings('perps.add_funds'))).toBeOnTheScreen();
      expect(screen.getByText(strings('perps.withdraw'))).toBeOnTheScreen();
    });
  });

  describe('User Interactions', () => {
    it('redirects to deposit view when add funds button is pressed', async () => {
      const mockDepositWithConfirmation = jest.fn().mockResolvedValue({
        result: Promise.resolve(),
      });
      mockUsePerpsTrading.mockReturnValue({
        depositWithConfirmation: mockDepositWithConfirmation,
      });

      renderWithProviders(<PerpsBalanceModal />);

      const addFundsButton = screen.getByText(strings('perps.add_funds'));

      await act(async () => {
        fireEvent.press(addFundsButton);
      });

      expect(mockNavigation.goBack).toHaveBeenCalled();
      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        Routes.PERPS.ROOT,
        expect.objectContaining({
          screen: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
        }),
      );
      expect(mockDepositWithConfirmation).toHaveBeenCalled();
    });

    it('redirects to withdraw view when withdraw button is pressed', async () => {
      renderWithProviders(<PerpsBalanceModal />);

      const withdrawButton = screen.getByText(strings('perps.withdraw'));

      await act(async () => {
        fireEvent.press(withdrawButton);
      });

      expect(mockNavigation.goBack).toHaveBeenCalled();
      expect(mockNavigation.navigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.WITHDRAW,
      });
    });
  });
});
