import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import {
  ParamListBase,
  NavigationProp,
  useNavigation,
} from '@react-navigation/native';
import ErrorModal from './ErrorModal';

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;

// Mock useTailwind hook
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => {
    const mockFn = jest.fn((styles: unknown) => {
      if (Array.isArray(styles)) {
        return styles.reduce((acc, style) => ({ ...acc, ...style }), {});
      }
      if (typeof styles === 'string') {
        return { testID: `tw-${styles}` };
      }
      return styles || {};
    });

    const tw = Object.assign(mockFn, {
      style: mockFn,
    });

    return tw;
  },
}));

// Mock BottomSheet component
jest.mock(
  '../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return ReactActual.forwardRef(
      ({ children, ...props }: { children?: React.ReactNode }, ref: unknown) =>
        ReactActual.createElement(
          View,
          {
            testID: 'bottom-sheet',
            ref,
            ...props,
          },
          children,
        ),
    );
  },
);

describe('ErrorModal', () => {
  const mockNavigation = {
    goBack: jest.fn(),
  };

  const defaultRoute = {
    params: {
      title: 'Test Error',
      description: 'This is a test error description',
      dismissLabel: 'OK',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavigation.mockReturnValue(
      mockNavigation as unknown as NavigationProp<ParamListBase>,
    );
  });

  describe('Basic Rendering', () => {
    it('should render without crashing', () => {
      // Arrange & Act & Assert
      expect(() => render(<ErrorModal route={defaultRoute} />)).not.toThrow();
    });

    it('should render all main UI elements', () => {
      // Arrange & Act
      const { getByTestId, getByText } = render(
        <ErrorModal route={defaultRoute} />,
      );

      // Assert
      expect(getByTestId('bottom-sheet')).toBeTruthy();
      expect(getByText('Test Error')).toBeTruthy();
      expect(getByText('This is a test error description')).toBeTruthy();
      expect(getByText('OK')).toBeTruthy();
    });
  });

  describe('Props Display', () => {
    it('should display the title from route params', () => {
      // Arrange
      const route = {
        params: {
          title: 'Custom Error Title',
          description: 'Error description',
        },
      };

      // Act
      const { getByText } = render(<ErrorModal route={route} />);

      // Assert
      expect(getByText('Custom Error Title')).toBeTruthy();
    });

    it('should display the description from route params', () => {
      // Arrange
      const route = {
        params: {
          title: 'Error',
          description: 'Custom error description message',
        },
      };

      // Act
      const { getByText } = render(<ErrorModal route={route} />);

      // Assert
      expect(getByText('Custom error description message')).toBeTruthy();
    });

    it('should display custom dismiss label when provided', () => {
      // Arrange
      const route = {
        params: {
          title: 'Error',
          description: 'Error description',
          dismissLabel: 'Close',
        },
      };

      // Act
      const { getByText } = render(<ErrorModal route={route} />);

      // Assert
      expect(getByText('Close')).toBeTruthy();
    });

    it('should display default dismiss label when not provided', () => {
      // Arrange
      const route = {
        params: {
          title: 'Error',
          description: 'Error description',
        },
      };

      // Act
      const { getByText } = render(<ErrorModal route={route} />);

      // Assert
      expect(getByText('Dismiss')).toBeTruthy();
    });
  });

  describe('Dismiss Functionality', () => {
    it('should call navigation.goBack when dismiss button is pressed', () => {
      // Arrange
      const { getByText } = render(<ErrorModal route={defaultRoute} />);
      const dismissButton = getByText('OK');

      // Act
      fireEvent.press(dismissButton);

      // Assert
      expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
    });

    it('should call navigation.goBack when default dismiss button is pressed', () => {
      // Arrange
      const routeWithoutDismissLabel = {
        params: {
          title: 'Error',
          description: 'Error description',
        },
      };
      const { getByText } = render(
        <ErrorModal route={routeWithoutDismissLabel} />,
      );
      const dismissButton = getByText('Dismiss');

      // Act
      fireEvent.press(dismissButton);

      // Assert
      expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('Component Structure', () => {
    it('should render bottom sheet container', () => {
      // Arrange & Act
      const { getByTestId } = render(<ErrorModal route={defaultRoute} />);

      // Assert
      expect(getByTestId('bottom-sheet')).toBeTruthy();
    });

    it('should handle different route param combinations', () => {
      // Arrange
      const minimalRoute = {
        params: {
          title: 'A',
          description: 'B',
        },
      };

      // Act & Assert
      expect(() => render(<ErrorModal route={minimalRoute} />)).not.toThrow();
    });
  });
});
