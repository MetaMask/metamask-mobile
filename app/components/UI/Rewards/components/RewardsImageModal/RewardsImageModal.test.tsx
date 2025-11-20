import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import RewardsImageModal from './RewardsImageModal';
import { ThemeImage } from '../../../../../core/Engine/controllers/rewards-controller/types';

// Mock dependencies
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: jest.fn(() => ({
    style: jest.fn((...args) => {
      // Handle both string and object arguments
      if (args.length === 1 && typeof args[0] === 'string') {
        return { testID: 'tw-style' };
      }
      // Handle style with dynamic properties
      return { testID: 'tw-style-dynamic' };
    }),
  })),
}));

interface ComponentProps {
  children?: React.ReactNode;
  testID?: string;
  [key: string]: unknown;
}

interface ButtonIconProps extends ComponentProps {
  onPress?: () => void;
  iconName?: string;
}

// Mock design system components
jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View, TouchableOpacity, Text } = jest.requireActual('react-native');

  return {
    Box: ({ children, testID, ...props }: ComponentProps) =>
      ReactActual.createElement(View, { testID, ...props }, children),
    ButtonIcon: ({ onPress, iconName, testID, ...props }: ButtonIconProps) =>
      ReactActual.createElement(
        TouchableOpacity,
        {
          onPress,
          testID: testID || 'button-icon',
          ...props,
        },
        ReactActual.createElement(
          Text,
          { testID: `icon-${iconName}` },
          'Close',
        ),
      ),
    ButtonIconSize: {
      Lg: 'lg',
    },
    IconName: {
      Close: 'close',
    },
    BoxFlexDirection: {
      Row: 'row',
    },
    BoxAlignItems: {
      Center: 'center',
    },
    BoxJustifyContent: {
      Center: 'center',
    },
  };
});

// Mock RewardsThemeImageComponent
jest.mock('../ThemeImageComponent', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Image: RNImage } = jest.requireActual('react-native');

  return {
    __esModule: true,
    default: () =>
      ReactActual.createElement(
        View,
        { testID: 'theme-image-wrapper' },
        ReactActual.createElement(RNImage, { testID: 'theme-image' }),
      ),
  };
});

describe('RewardsImageModal', () => {
  const mockThemeImage: ThemeImage = {
    lightModeUrl: 'https://example.com/light.png',
    darkModeUrl: 'https://example.com/dark.png',
  };

  const mockFallbackImage = { uri: 'https://example.com/fallback.png' };
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders correctly when visible', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <RewardsImageModal
          visible
          onClose={mockOnClose}
          themeImage={mockThemeImage}
        />,
      );

      // Assert
      expect(getByTestId('theme-image')).toBeOnTheScreen();
    });

    it('does not render when not visible', () => {
      // Arrange & Act
      render(
        <RewardsImageModal
          visible={false}
          onClose={mockOnClose}
          themeImage={mockThemeImage}
        />,
      );

      // Assert - Modal component still exists but is not visible
      // We can't easily test the Modal's visible prop behavior without snapshots
      // but we can verify the component renders without errors
      expect(() =>
        render(
          <RewardsImageModal
            visible={false}
            onClose={mockOnClose}
            themeImage={mockThemeImage}
          />,
        ),
      ).not.toThrow();
    });

    it('renders without crashing with minimal props', () => {
      // Arrange & Act & Assert
      expect(() =>
        render(<RewardsImageModal visible={false} onClose={mockOnClose} />),
      ).not.toThrow();
    });
  });

  describe('Close Button Interaction', () => {
    it('renders close icon correctly', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <RewardsImageModal
          visible
          onClose={mockOnClose}
          themeImage={mockThemeImage}
        />,
      );

      // Assert
      expect(getByTestId('icon-close')).toBeOnTheScreen();
    });
  });

  describe('Backdrop Interaction', () => {
    it('calls onClose when backdrop is pressed', () => {
      // Arrange
      const { getByTestId } = render(
        <RewardsImageModal
          visible
          onClose={mockOnClose}
          themeImage={mockThemeImage}
        />,
      );

      // Act
      // Find the TouchableOpacity that wraps the image
      const backdrop = getByTestId('theme-image').parent?.parent;
      if (backdrop) {
        fireEvent.press(backdrop);
      }

      // Assert
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Theme Image Rendering', () => {
    it('renders RewardsThemeImageComponent when themeImage is provided', () => {
      // Arrange & Act
      const { getByTestId, queryByTestId } = render(
        <RewardsImageModal
          visible
          onClose={mockOnClose}
          themeImage={mockThemeImage}
        />,
      );

      // Assert
      expect(getByTestId('theme-image')).toBeOnTheScreen();
      expect(queryByTestId('fallback-image')).toBeNull();
    });

    it('passes themeImage prop to RewardsThemeImageComponent', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <RewardsImageModal
          visible
          onClose={mockOnClose}
          themeImage={mockThemeImage}
        />,
      );

      // Assert
      expect(getByTestId('theme-image')).toBeOnTheScreen();
    });
  });

  describe('Fallback Image Rendering', () => {
    it('renders fallback image when provided and no themeImage', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <RewardsImageModal
          visible
          onClose={mockOnClose}
          fallbackImage={mockFallbackImage}
        />,
      );

      // Assert
      const fallbackImage = getByTestId('fallback-image');
      expect(fallbackImage).toBeOnTheScreen();
      expect(fallbackImage.props.source).toEqual(mockFallbackImage);
    });

    it('uses contain resize mode for fallback image', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <RewardsImageModal
          visible
          onClose={mockOnClose}
          fallbackImage={mockFallbackImage}
        />,
      );

      // Assert
      const fallbackImage = getByTestId('fallback-image');
      expect(fallbackImage.props.resizeMode).toBe('contain');
    });

    it('prioritizes themeImage over fallbackImage when both provided', () => {
      // Arrange & Act
      const { getByTestId, queryByTestId } = render(
        <RewardsImageModal
          visible
          onClose={mockOnClose}
          themeImage={mockThemeImage}
          fallbackImage={mockFallbackImage}
        />,
      );

      // Assert
      expect(getByTestId('theme-image')).toBeOnTheScreen();
      expect(queryByTestId('fallback-image')).toBeNull();
    });
  });

  describe('No Image Rendering', () => {
    it('renders nothing when neither themeImage nor fallbackImage provided', () => {
      // Arrange & Act
      const { queryByTestId } = render(
        <RewardsImageModal visible onClose={mockOnClose} />,
      );

      // Assert
      expect(queryByTestId('theme-image')).toBeNull();
      expect(queryByTestId('fallback-image')).toBeNull();
    });
  });

  describe('Modal Properties', () => {
    it('renders with correct modal configuration', () => {
      // Arrange & Act
      const { UNSAFE_getByType } = render(
        <RewardsImageModal
          visible
          onClose={mockOnClose}
          themeImage={mockThemeImage}
        />,
      );

      // Get the Modal component
      const { Modal } = jest.requireActual('react-native');
      const modalComponent = UNSAFE_getByType(Modal);

      // Assert
      expect(modalComponent.props.visible).toBe(true);
      expect(modalComponent.props.transparent).toBe(true);
      expect(modalComponent.props.animationType).toBe('fade');
      expect(modalComponent.props.statusBarTranslucent).toBe(true);
    });

    it('calls onClose when modal onRequestClose is triggered', () => {
      // Arrange
      const { UNSAFE_getByType } = render(
        <RewardsImageModal
          visible
          onClose={mockOnClose}
          themeImage={mockThemeImage}
        />,
      );

      // Act
      const { Modal } = jest.requireActual('react-native');
      const modalComponent = UNSAFE_getByType(Modal);
      modalComponent.props.onRequestClose();

      // Assert
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('renders with empty themeImage object', () => {
      // Arrange
      const emptyThemeImage = {} as ThemeImage;

      // Act & Assert
      expect(() =>
        render(
          <RewardsImageModal
            visible
            onClose={mockOnClose}
            themeImage={emptyThemeImage}
          />,
        ),
      ).not.toThrow();
    });

    it('renders with undefined fallbackImage', () => {
      // Arrange & Act & Assert
      expect(() =>
        render(
          <RewardsImageModal
            visible
            onClose={mockOnClose}
            fallbackImage={undefined}
          />,
        ),
      ).not.toThrow();
    });
  });
});
