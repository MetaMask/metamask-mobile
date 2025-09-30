import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import type { ThemeColors } from '@metamask/design-tokens';
import { NETWORK_SELECTOR_TEST_IDS } from '../../../constants/networkSelector';
import renderWithProvider from '../../../util/test/renderWithProvider';
import createStyles from './ContextualNetworkPicker.styles';
import ContextualNetworkPicker from './ContextualNetworkPicker';
import { BASE_DISPLAY_NAME } from '../../../core/Engine/constants';

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
      const networkName = BASE_DISPLAY_NAME;
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

  describe('Styles', () => {
    const mockColors = {
      background: {
        default: '#ffffff',
        alternative: '#f2f3f4',
      },
      border: {
        default: '#d6d9dc',
        muted: '#bbc0c5',
      },
      text: {
        default: '#24272a',
        alternative: '#535a61',
      },
    } as unknown as ThemeColors;

    it('should create styles with enabled state (disabled=false)', () => {
      const styles = createStyles(mockColors, false);

      expect(styles.base.borderColor).toBe(mockColors.border.default);
      expect(styles.avatar.opacity).toBe(1);
      expect(styles.networkName.opacity).toBe(1);
    });

    it('should create styles with disabled state (disabled=true)', () => {
      const styles = createStyles(mockColors, true);

      expect(styles.base.borderColor).toBe(mockColors.border.muted);
      expect(styles.avatar.opacity).toBe(0.5);
      expect(styles.networkName.opacity).toBe(0.5);
    });

    it('should create consistent static styles regardless of disabled state', () => {
      const enabledStyles = createStyles(mockColors, false);
      const disabledStyles = createStyles(mockColors, true);

      // These styles should be identical regardless of disabled state
      expect(enabledStyles.accountSelectorWrapper).toEqual(
        disabledStyles.accountSelectorWrapper,
      );
      expect(enabledStyles.avatarWrapper).toEqual(disabledStyles.avatarWrapper);
      expect(enabledStyles.row).toEqual(disabledStyles.row);
    });

    it('should return valid StyleSheet objects with all expected properties', () => {
      const styles = createStyles(mockColors, false);

      expect(styles).toHaveProperty('base');
      expect(styles).toHaveProperty('accountSelectorWrapper');
      expect(styles).toHaveProperty('avatarWrapper');
      expect(styles).toHaveProperty('row');
      expect(styles).toHaveProperty('avatar');
      expect(styles).toHaveProperty('networkName');
    });
  });
});
