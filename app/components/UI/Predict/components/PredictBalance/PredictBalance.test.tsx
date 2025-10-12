import { fireEvent } from '@testing-library/react-native';
import React from 'react';
import { ActivityIndicator, TouchableOpacity } from 'react-native';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import PredictBalance from './PredictBalance';

// Mock Clipboard
jest.mock('@react-native-clipboard/clipboard', () => ({
  setString: jest.fn(),
}));

import Clipboard from '@react-native-clipboard/clipboard';

const mockClipboard = Clipboard as jest.Mocked<typeof Clipboard>;

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('PredictBalance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when loading', () => {
    it('displays loading indicator when isLoading is true', () => {
      // Arrange
      const props = {
        balance: 100,
        isLoading: true,
        address: '0x1234567890abcdef1234567890abcdef12345678',
      };

      // Act
      const { getByTestId, UNSAFE_getByType } = renderWithProvider(
        <PredictBalance {...props} />,
        { state: initialState },
      );

      // Assert
      expect(getByTestId('predict-onboarding-card')).toBeOnTheScreen();
      const activityIndicator = UNSAFE_getByType(ActivityIndicator);
      expect(activityIndicator).toBeDefined();
    });

    it('does not display balance when isLoading is true', () => {
      // Arrange
      const props = {
        balance: 100,
        isLoading: true,
        address: '0x1234567890abcdef1234567890abcdef12345678',
      };

      // Act
      const { queryByText } = renderWithProvider(
        <PredictBalance {...props} />,
        { state: initialState },
      );

      // Assert
      expect(queryByText(/Balance:/)).not.toBeOnTheScreen();
    });

    it('does not display address when isLoading is true', () => {
      // Arrange
      const props = {
        balance: 100,
        isLoading: true,
        address: '0x1234567890abcdef1234567890abcdef12345678',
      };

      // Act
      const { queryByText } = renderWithProvider(
        <PredictBalance {...props} />,
        { state: initialState },
      );

      // Assert
      expect(queryByText(/0x1234/)).not.toBeOnTheScreen();
    });
  });

  describe('when loaded', () => {
    it('displays formatted balance with up to 4 decimals for values under $1000', () => {
      // Arrange
      const props = {
        balance: 123.456,
        isLoading: false,
      };

      // Act
      const { getByText } = renderWithProvider(<PredictBalance {...props} />, {
        state: initialState,
      });

      // Assert
      expect(getByText(/Balance: \$123\.456/)).toBeOnTheScreen();
    });

    it('displays zero balance', () => {
      // Arrange
      const props = {
        balance: 0,
        isLoading: false,
      };

      // Act
      const { getByText } = renderWithProvider(<PredictBalance {...props} />, {
        state: initialState,
      });

      // Assert
      expect(getByText(/Balance: \$0\.00/)).toBeOnTheScreen();
    });

    it('displays large balance correctly', () => {
      // Arrange
      const props = {
        balance: 1234567.89,
        isLoading: false,
      };

      // Act
      const { getByText } = renderWithProvider(<PredictBalance {...props} />, {
        state: initialState,
      });

      // Assert
      expect(getByText(/Balance: \$1,234,567\.89/)).toBeOnTheScreen();
    });

    it('renders container with correct test ID', () => {
      // Arrange
      const props = {
        balance: 100,
        isLoading: false,
      };

      // Act
      const { getByTestId } = renderWithProvider(
        <PredictBalance {...props} />,
        { state: initialState },
      );

      // Assert
      expect(getByTestId('predict-onboarding-card')).toBeOnTheScreen();
    });
  });

  describe('address display', () => {
    it('displays truncated address when address is provided', () => {
      // Arrange
      const address = '0x1234567890abcdef1234567890abcdef12345678';
      const props = {
        balance: 100,
        isLoading: false,
        address,
      };

      // Act
      const { getByText } = renderWithProvider(<PredictBalance {...props} />, {
        state: initialState,
      });

      // Assert
      expect(getByText('0x1234...5678')).toBeOnTheScreen();
    });

    it('does not display address when address is not provided', () => {
      // Arrange
      const props = {
        balance: 100,
        isLoading: false,
        address: undefined,
      };

      // Act
      const { queryByText } = renderWithProvider(
        <PredictBalance {...props} />,
        { state: initialState },
      );

      // Assert
      expect(queryByText(/0x/)).not.toBeOnTheScreen();
    });

    it('displays copy button when address is provided', () => {
      // Arrange
      const address = '0x1234567890abcdef1234567890abcdef12345678';
      const props = {
        balance: 100,
        isLoading: false,
        address,
      };

      // Act
      const { UNSAFE_getAllByType } = renderWithProvider(
        <PredictBalance {...props} />,
        { state: initialState },
      );

      // Assert - Find TouchableOpacity which is the copy button
      const touchables = UNSAFE_getAllByType(TouchableOpacity);
      expect(touchables.length).toBeGreaterThan(0);
    });

    it('does not display copy button when address is not provided', () => {
      // Arrange
      const props = {
        balance: 100,
        isLoading: false,
        address: undefined,
      };

      // Act
      const { UNSAFE_queryAllByType } = renderWithProvider(
        <PredictBalance {...props} />,
        { state: initialState },
      );

      // Assert - No TouchableOpacity should be present when address is not provided
      const touchables = UNSAFE_queryAllByType(TouchableOpacity);
      expect(touchables.length).toBe(0);
    });
  });

  describe('copy to clipboard functionality', () => {
    it('copies address to clipboard when copy button is pressed', () => {
      // Arrange
      const address = '0x1234567890abcdef1234567890abcdef12345678';
      const props = {
        balance: 100,
        isLoading: false,
        address,
      };

      // Act
      const { UNSAFE_getAllByType } = renderWithProvider(
        <PredictBalance {...props} />,
        { state: initialState },
      );

      const touchables = UNSAFE_getAllByType(TouchableOpacity);
      const copyButton = touchables[0];
      fireEvent.press(copyButton);

      // Assert
      expect(mockClipboard.setString).toHaveBeenCalledTimes(1);
      expect(mockClipboard.setString).toHaveBeenCalledWith(address);
    });

    it('copies full address including checksum', () => {
      // Arrange
      const address = '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12';
      const props = {
        balance: 100,
        isLoading: false,
        address,
      };

      // Act
      const { UNSAFE_getAllByType } = renderWithProvider(
        <PredictBalance {...props} />,
        { state: initialState },
      );

      const touchables = UNSAFE_getAllByType(TouchableOpacity);
      const copyButton = touchables[0];
      fireEvent.press(copyButton);

      // Assert
      expect(mockClipboard.setString).toHaveBeenCalledWith(address);
    });

    it('can copy address multiple times', () => {
      // Arrange
      const address = '0x1234567890abcdef1234567890abcdef12345678';
      const props = {
        balance: 100,
        isLoading: false,
        address,
      };

      // Act
      const { UNSAFE_getAllByType } = renderWithProvider(
        <PredictBalance {...props} />,
        { state: initialState },
      );

      const touchables = UNSAFE_getAllByType(TouchableOpacity);
      const copyButton = touchables[0];
      fireEvent.press(copyButton);
      fireEvent.press(copyButton);
      fireEvent.press(copyButton);

      // Assert
      expect(mockClipboard.setString).toHaveBeenCalledTimes(3);
    });
  });

  describe('edge cases', () => {
    it('handles negative balance by showing threshold message', () => {
      // Arrange
      const props = {
        balance: -50.25,
        isLoading: false,
      };

      // Act
      const { getByText } = renderWithProvider(<PredictBalance {...props} />, {
        state: initialState,
      });

      // Assert - negative values below threshold show "<$0.0001"
      expect(getByText(/Balance: <\$0\.0001/)).toBeOnTheScreen();
    });

    it('handles very small balance', () => {
      // Arrange
      const props = {
        balance: 0.01,
        isLoading: false,
      };

      // Act
      const { getByText } = renderWithProvider(<PredictBalance {...props} />, {
        state: initialState,
      });

      // Assert
      expect(getByText(/Balance: \$0\.01/)).toBeOnTheScreen();
    });

    it('handles short address', () => {
      // Arrange
      const address = '0x1234';
      const props = {
        balance: 100,
        isLoading: false,
        address,
      };

      // Act
      const { getByText } = renderWithProvider(<PredictBalance {...props} />, {
        state: initialState,
      });

      // Assert - short address shows first 6 chars (0x1234) + ... + last 4 chars (1234)
      expect(getByText('0x1234...1234')).toBeOnTheScreen();
    });

    it('handles empty string address', () => {
      // Arrange
      const props = {
        balance: 100,
        isLoading: false,
        address: '',
      };

      // Act
      const { UNSAFE_queryAllByType } = renderWithProvider(
        <PredictBalance {...props} />,
        { state: initialState },
      );

      // Assert - empty string is falsy, so copy button should not appear
      const touchables = UNSAFE_queryAllByType(TouchableOpacity);
      expect(touchables.length).toBe(0);
    });
  });
});
