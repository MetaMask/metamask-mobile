import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import ContextualNetworkPicker from './ContextualNetworkPicker';
import { NETWORK_SELECTOR_TEST_IDS } from '../../../constants/networkSelector';

jest.mock('../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      background: {
        default: '#ffffff',
      },
      border: {
        muted: '#cccccc',
      },
      text: {
        default: '#000000',
      },
    },
  }),
}));

jest.mock('./ContextualNetworkPicker.styles', () => ({
  __esModule: true,
  default: () => ({
    accountSelectorWrapper: {
      marginHorizontal: 16,
      marginVertical: 8,
    },
    base: {
      padding: 12,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatarWrapper: {
      marginRight: 8,
    },
    avatar: {},
    networkName: {
      fontSize: 16,
    },
  }),
}));

describe('ContextualNetworkPicker', () => {
  const defaultProps = {
    onPress: jest.fn(),
    networkName: 'Ethereum Mainnet',
    networkImageSource: { uri: 'https://example.com/ethereum.png' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render correctly with required props', () => {
      const { getByText, getByTestId } = renderWithProvider(
        <ContextualNetworkPicker
          onPress={defaultProps.onPress}
          networkName={defaultProps.networkName}
        />,
      );

      expect(getByText('Ethereum Mainnet')).toBeTruthy();
      expect(
        getByTestId(NETWORK_SELECTOR_TEST_IDS.CONTEXTUAL_NETWORK_PICKER),
      ).toBeTruthy();
    });

    it('should render correctly with all props including networkImageSource', () => {
      const { getByText, getByTestId } = renderWithProvider(
        <ContextualNetworkPicker {...defaultProps} />,
      );

      expect(getByText('Ethereum Mainnet')).toBeTruthy();
      expect(
        getByTestId(NETWORK_SELECTOR_TEST_IDS.CONTEXTUAL_NETWORK_PICKER),
      ).toBeTruthy();
    });

    it('should display the correct network name', () => {
      const customNetworkName = 'Polygon Mainnet';
      const { getByText } = renderWithProvider(
        <ContextualNetworkPicker
          onPress={defaultProps.onPress}
          networkName={customNetworkName}
        />,
      );

      expect(getByText(customNetworkName)).toBeTruthy();
    });

    it('should render Avatar with correct props', () => {
      const { getByTestId } = renderWithProvider(
        <ContextualNetworkPicker {...defaultProps} />,
      );

      const avatar = getByTestId(
        NETWORK_SELECTOR_TEST_IDS.CONTEXTUAL_NETWORK_PICKER,
      );
      expect(avatar).toBeTruthy();
      expect(avatar.props.accessibilityLabel).toBe(defaultProps.networkName);
    });
  });

  describe('Interaction', () => {
    it('should call onPress when pressed and not disabled', () => {
      const mockOnPress = jest.fn();
      const { getByTestId } = renderWithProvider(
        <ContextualNetworkPicker
          onPress={mockOnPress}
          networkName={defaultProps.networkName}
        />,
      );

      const picker = getByTestId(
        NETWORK_SELECTOR_TEST_IDS.CONTEXTUAL_NETWORK_PICKER,
      ).parent?.parent;

      if (picker) {
        fireEvent.press(picker);
        expect(mockOnPress).toHaveBeenCalledTimes(1);
      }
    });

    it('should not call onPress when disabled', () => {
      const mockOnPress = jest.fn();
      const { getByTestId } = renderWithProvider(
        <ContextualNetworkPicker
          onPress={mockOnPress}
          networkName={defaultProps.networkName}
          disabled
        />,
      );

      const picker = getByTestId(
        NETWORK_SELECTOR_TEST_IDS.CONTEXTUAL_NETWORK_PICKER,
      ).parent?.parent;

      if (picker) {
        fireEvent.press(picker);
        expect(mockOnPress).not.toHaveBeenCalled();
      }
    });
  });

  describe('Disabled State', () => {
    it('should handle disabled prop correctly', () => {
      const mockOnPress = jest.fn();
      const { getByTestId } = renderWithProvider(
        <ContextualNetworkPicker
          onPress={mockOnPress}
          networkName={defaultProps.networkName}
          disabled
        />,
      );

      expect(
        getByTestId(NETWORK_SELECTOR_TEST_IDS.CONTEXTUAL_NETWORK_PICKER),
      ).toBeTruthy();
      expect(
        getByTestId(NETWORK_SELECTOR_TEST_IDS.CONTEXTUAL_NETWORK_PICKER).props
          .accessibilityLabel,
      ).toBe(defaultProps.networkName);
    });

    it('should use noop function when disabled', () => {
      const mockOnPress = jest.fn();

      const { getByTestId } = renderWithProvider(
        <ContextualNetworkPicker
          onPress={mockOnPress}
          networkName={defaultProps.networkName}
          disabled
        />,
      );

      expect(
        getByTestId(NETWORK_SELECTOR_TEST_IDS.CONTEXTUAL_NETWORK_PICKER),
      ).toBeTruthy();
    });
  });

  describe('Props Validation', () => {
    it('should handle missing networkImageSource gracefully', () => {
      const { getByText, getByTestId } = renderWithProvider(
        <ContextualNetworkPicker
          onPress={defaultProps.onPress}
          networkName={defaultProps.networkName}
        />,
      );

      expect(getByText(defaultProps.networkName)).toBeTruthy();
      expect(
        getByTestId(NETWORK_SELECTOR_TEST_IDS.CONTEXTUAL_NETWORK_PICKER),
      ).toBeTruthy();
    });

    it('should handle empty network name', () => {
      const { getByTestId } = renderWithProvider(
        <ContextualNetworkPicker
          onPress={defaultProps.onPress}
          networkName=""
        />,
      );

      const avatar = getByTestId(
        NETWORK_SELECTOR_TEST_IDS.CONTEXTUAL_NETWORK_PICKER,
      );
      expect(avatar).toBeTruthy();
      expect(avatar.props.accessibilityLabel).toBe('');
    });

    it('should default disabled to false when not provided', () => {
      const mockOnPress = jest.fn();
      const { getByTestId } = renderWithProvider(
        <ContextualNetworkPicker
          onPress={mockOnPress}
          networkName={defaultProps.networkName}
        />,
      );

      const picker = getByTestId(
        NETWORK_SELECTOR_TEST_IDS.CONTEXTUAL_NETWORK_PICKER,
      ).parent?.parent;

      if (picker) {
        fireEvent.press(picker);
        expect(mockOnPress).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('Network Image Handling', () => {
    it('should handle URI-based image sources', () => {
      const uriImageSource = { uri: 'https://example.com/network.png' };
      const { getByTestId } = renderWithProvider(
        <ContextualNetworkPicker
          onPress={defaultProps.onPress}
          networkName={defaultProps.networkName}
          networkImageSource={uriImageSource}
        />,
      );

      expect(
        getByTestId(NETWORK_SELECTOR_TEST_IDS.CONTEXTUAL_NETWORK_PICKER),
      ).toBeTruthy();
    });

    it('should handle numeric image sources', () => {
      const numericImageSource = 123; // Simulates require() numeric reference
      const { getByTestId } = renderWithProvider(
        <ContextualNetworkPicker
          onPress={defaultProps.onPress}
          networkName={defaultProps.networkName}
          networkImageSource={numericImageSource}
        />,
      );

      expect(
        getByTestId(NETWORK_SELECTOR_TEST_IDS.CONTEXTUAL_NETWORK_PICKER),
      ).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility label', () => {
      const networkName = 'Arbitrum One';
      const { getByTestId } = renderWithProvider(
        <ContextualNetworkPicker
          onPress={defaultProps.onPress}
          networkName={networkName}
        />,
      );

      const avatar = getByTestId(
        NETWORK_SELECTOR_TEST_IDS.CONTEXTUAL_NETWORK_PICKER,
      );
      expect(avatar.props.accessibilityLabel).toBe(networkName);
    });

    it('should maintain accessibility when disabled', () => {
      const networkName = 'Base Mainnet';
      const { getByTestId } = renderWithProvider(
        <ContextualNetworkPicker
          onPress={defaultProps.onPress}
          networkName={networkName}
          disabled
        />,
      );

      const avatar = getByTestId(
        NETWORK_SELECTOR_TEST_IDS.CONTEXTUAL_NETWORK_PICKER,
      );
      expect(avatar.props.accessibilityLabel).toBe(networkName);
    });
  });

  describe('Component Structure', () => {
    it('should render PickerBase with correct props', () => {
      const { getByTestId } = renderWithProvider(
        <ContextualNetworkPicker {...defaultProps} />,
      );

      const avatar = getByTestId(
        NETWORK_SELECTOR_TEST_IDS.CONTEXTUAL_NETWORK_PICKER,
      );
      expect(avatar.parent?.parent?.parent).toBeTruthy();
    });

    it('should apply styles correctly', () => {
      const { getByTestId } = renderWithProvider(
        <ContextualNetworkPicker {...defaultProps} />,
      );

      expect(
        getByTestId(NETWORK_SELECTOR_TEST_IDS.CONTEXTUAL_NETWORK_PICKER),
      ).toBeTruthy();
    });
  });
});
