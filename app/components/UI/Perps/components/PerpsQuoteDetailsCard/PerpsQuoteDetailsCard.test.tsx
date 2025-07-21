import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import PerpsQuoteDetailsCard from './PerpsQuoteDetailsCard';
import Routes from '../../../../../constants/navigation/Routes';

// Mock dependencies
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

// Mock useStyles hook
jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: jest.fn(() => ({
    styles: {
      container: {},
      quoteDetails: {},
      quoteRow: {},
      slippageButton: {},
    },
    theme: {
      colors: {
        primary: {
          default: '#0376C9',
        },
      },
    },
  })),
}));

describe('PerpsQuoteDetailsCard', () => {
  const mockNavigate = jest.fn();
  const mockUseNavigation = useNavigation as jest.Mock;
  const mockUseSelector = useSelector as jest.Mock;

  const defaultProps = {
    networkFee: '$0.25',
    rate: '1 USDC = 1 USDC',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
    });
    mockUseSelector.mockReturnValue(null); // Default slippage
  });

  describe('Rendering', () => {
    it('should render all required fields correctly', () => {
      const { getByText } = renderWithProvider(
        <PerpsQuoteDetailsCard {...defaultProps} />,
      );

      expect(getByText('perps.deposit.network_fee')).toBeTruthy();
      expect(getByText('$0.25')).toBeTruthy();
      expect(getByText('perps.deposit.metamask_fee')).toBeTruthy();
      expect(getByText('$0.00')).toBeTruthy(); // Default metamask fee
      expect(getByText('perps.deposit.rate')).toBeTruthy();
      expect(getByText('1 USDC = 1 USDC')).toBeTruthy();
      expect(getByText('perps.deposit.slippage')).toBeTruthy();
    });

    it('should render with all props provided', () => {
      const props = {
        networkFee: '$0.50',
        estimatedTime: '2-3 minutes',
        rate: '1 ETH = 3000 USDC',
        metamaskFee: '$5.00',
      };

      const { getByText } = renderWithProvider(
        <PerpsQuoteDetailsCard {...props} />,
      );

      expect(getByText('$0.50')).toBeTruthy();
      expect(getByText('perps.deposit.estimated_time')).toBeTruthy();
      expect(getByText('2-3 minutes')).toBeTruthy();
      expect(getByText('1 ETH = 3000 USDC')).toBeTruthy();
      expect(getByText('$5.00')).toBeTruthy();
    });

    it('should not render estimated time when not provided', () => {
      const { queryByText } = renderWithProvider(
        <PerpsQuoteDetailsCard {...defaultProps} />,
      );

      expect(queryByText('perps.deposit.estimated_time')).toBeNull();
    });

    it('should render estimated time when provided', () => {
      const props = {
        ...defaultProps,
        estimatedTime: '1-2 minutes',
      };

      const { getByText } = renderWithProvider(
        <PerpsQuoteDetailsCard {...props} />,
      );

      expect(getByText('perps.deposit.estimated_time')).toBeTruthy();
      expect(getByText('1-2 minutes')).toBeTruthy();
    });

    it('should use default metamask fee when not provided', () => {
      const { getByText } = renderWithProvider(
        <PerpsQuoteDetailsCard {...defaultProps} />,
      );

      expect(getByText('$0.00')).toBeTruthy();
    });

    it('should use custom metamask fee when provided', () => {
      const props = {
        ...defaultProps,
        metamaskFee: '$2.50',
      };

      const { getByText } = renderWithProvider(
        <PerpsQuoteDetailsCard {...props} />,
      );

      expect(getByText('$2.50')).toBeTruthy();
    });
  });

  describe('Slippage Display', () => {
    it('should display auto slippage when slippage is null', () => {
      mockUseSelector.mockReturnValue(null);

      const { getByText } = renderWithProvider(
        <PerpsQuoteDetailsCard {...defaultProps} />,
      );

      expect(getByText('perps.deposit.slippage_auto')).toBeTruthy();
    });

    it('should display auto slippage when slippage is undefined', () => {
      mockUseSelector.mockReturnValue(undefined);

      const { getByText } = renderWithProvider(
        <PerpsQuoteDetailsCard {...defaultProps} />,
      );

      expect(getByText('perps.deposit.slippage_auto')).toBeTruthy();
    });

    it('should display custom slippage percentage when provided', () => {
      mockUseSelector.mockReturnValue(0.5);

      const { getByText } = renderWithProvider(
        <PerpsQuoteDetailsCard {...defaultProps} />,
      );

      expect(getByText('0.5%')).toBeTruthy();
    });

    it('should handle zero slippage correctly', () => {
      mockUseSelector.mockReturnValue(0);

      const { getByText } = renderWithProvider(
        <PerpsQuoteDetailsCard {...defaultProps} />,
      );

      expect(getByText('0%')).toBeTruthy();
    });

    it('should handle various slippage values correctly', () => {
      const slippageValues = [0.1, 0.5, 1, 2.5, 5, 10];

      slippageValues.forEach((slippage) => {
        mockUseSelector.mockReturnValue(slippage);

        const { getByText, unmount } = renderWithProvider(
          <PerpsQuoteDetailsCard {...defaultProps} />,
        );

        expect(getByText(`${slippage}%`)).toBeTruthy();
        unmount();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to slippage modal when edit button is pressed', () => {
      const { getByTestId } = renderWithProvider(
        <PerpsQuoteDetailsCard {...defaultProps} />,
      );

      const editButton = getByTestId('edit-slippage-button');
      fireEvent.press(editButton);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.MODALS.ROOT, {
        screen: Routes.PERPS.MODALS.SLIPPAGE_MODAL,
      });
    });

    it('should call navigation only once per button press', () => {
      const { getByTestId } = renderWithProvider(
        <PerpsQuoteDetailsCard {...defaultProps} />,
      );

      const editButton = getByTestId('edit-slippage-button');
      fireEvent.press(editButton);
      fireEvent.press(editButton);

      expect(mockNavigate).toHaveBeenCalledTimes(2);
    });
  });

  describe('Component Structure', () => {
    it('should render slippage button with correct testID', () => {
      const { getByTestId } = renderWithProvider(
        <PerpsQuoteDetailsCard {...defaultProps} />,
      );

      const slippageButton = getByTestId('edit-slippage-button');
      expect(slippageButton).toBeTruthy();
    });

    it('should render component without crashing', () => {
      const { getByText } = renderWithProvider(
        <PerpsQuoteDetailsCard {...defaultProps} />,
      );

      expect(getByText('perps.deposit.network_fee')).toBeTruthy();
    });
  });

  describe('Props Validation', () => {
    it('should handle empty string values', () => {
      const props = {
        networkFee: '',
        rate: '',
        metamaskFee: '',
      };

      const { getByText } = renderWithProvider(
        <PerpsQuoteDetailsCard {...props} />,
      );

      expect(getByText('perps.deposit.network_fee')).toBeTruthy();
      expect(getByText('perps.deposit.rate')).toBeTruthy();
      expect(getByText('perps.deposit.metamask_fee')).toBeTruthy();
    });

    it('should handle special characters in values', () => {
      const props = {
        networkFee: '$0.25 + fees',
        rate: '1 USDC ≈ 1 USDC',
        metamaskFee: '~$0.00',
      };

      const { getByText } = renderWithProvider(
        <PerpsQuoteDetailsCard {...props} />,
      );

      expect(getByText('$0.25 + fees')).toBeTruthy();
      expect(getByText('1 USDC ≈ 1 USDC')).toBeTruthy();
      expect(getByText('~$0.00')).toBeTruthy();
    });

    it('should handle long text values', () => {
      const props = {
        networkFee: 'Very long network fee description that might wrap',
        rate: 'Long rate description with many details about the conversion',
        estimatedTime: 'This is a very long estimated time description',
      };

      const { getByText } = renderWithProvider(
        <PerpsQuoteDetailsCard {...props} />,
      );

      expect(getByText(props.networkFee)).toBeTruthy();
      expect(getByText(props.rate)).toBeTruthy();
      expect(getByText(props.estimatedTime)).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle navigation errors gracefully', () => {
      mockUseNavigation.mockReturnValue({
        navigate: jest.fn(() => {
          throw new Error('Navigation failed');
        }),
      });

      const { getByTestId } = renderWithProvider(
        <PerpsQuoteDetailsCard {...defaultProps} />,
      );

      const editButton = getByTestId('edit-slippage-button');

      // Should throw when navigation fails
      expect(() => fireEvent.press(editButton)).toThrow('Navigation failed');
    });
  });

  describe('Accessibility', () => {
    it('should have proper testID for slippage button', () => {
      const { getByTestId } = renderWithProvider(
        <PerpsQuoteDetailsCard {...defaultProps} />,
      );

      const slippageButton = getByTestId('edit-slippage-button');
      expect(slippageButton).toBeTruthy();
    });

    it('should handle button press interactions', () => {
      const { getByTestId } = renderWithProvider(
        <PerpsQuoteDetailsCard {...defaultProps} />,
      );

      const editButton = getByTestId('edit-slippage-button');
      fireEvent.press(editButton);

      expect(mockNavigate).toHaveBeenCalled();
    });
  });

  describe('Integration', () => {
    it('should work with all features together', () => {
      mockUseSelector.mockReturnValue(2.5);

      const props = {
        networkFee: '$0.75',
        estimatedTime: '3-4 minutes',
        rate: '1 ETH = 2500 USDC',
        metamaskFee: '$3.50',
      };

      const { getByText, getByTestId } = renderWithProvider(
        <PerpsQuoteDetailsCard {...props} />,
      );

      // Check all values are displayed
      expect(getByText('$0.75')).toBeTruthy();
      expect(getByText('3-4 minutes')).toBeTruthy();
      expect(getByText('1 ETH = 2500 USDC')).toBeTruthy();
      expect(getByText('$3.50')).toBeTruthy();
      expect(getByText('2.5%')).toBeTruthy();

      // Check navigation works
      const editButton = getByTestId('edit-slippage-button');
      fireEvent.press(editButton);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.MODALS.ROOT, {
        screen: Routes.PERPS.MODALS.SLIPPAGE_MODAL,
      });
    });
  });
});
