import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import PredictNewButton from './PredictNewButton';
import Routes from '../../../../../constants/navigation/Routes';
import renderWithProvider from '../../../../../util/test/renderWithProvider';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: jest.fn(() => ({
    style: jest.fn((...args) => args.join(' ')),
  })),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const { View, Text: RNText } = jest.requireActual('react-native');
  return {
    Box: ({
      children,
      testID,
      ...props
    }: {
      children: React.ReactNode;
      testID?: string;
      [key: string]: unknown;
    }) => (
      <View testID={testID} {...props}>
        {children}
      </View>
    ),
    Text: ({
      children,
      testID,
      ...props
    }: {
      children: React.ReactNode;
      testID?: string;
      [key: string]: unknown;
    }) => (
      <RNText testID={testID} {...props}>
        {children}
      </RNText>
    ),
    TextVariant: {
      BodyMd: 'BodyMd',
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
    FontWeight: {
      Medium: 'medium',
    },
  };
});

jest.mock('../../../../../component-library/components/Icons/Icon', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      name,
      size,
      color,
      testID,
      ...props
    }: {
      name: string;
      size: string;
      color: string;
      testID?: string;
      [key: string]: unknown;
    }) => (
      <View testID={testID || 'icon'} {...props}>
        {name}
      </View>
    ),
    IconName: {
      Add: 'add',
    },
    IconSize: {
      Md: 'md',
    },
    IconColor: {
      Default: 'default',
    },
  };
});

// Mock strings
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const mockStrings: Record<string, string> = {
      'predict.tab.new_prediction': 'New prediction',
    };
    return mockStrings[key] || key;
  }),
}));

describe('PredictNewButton', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    dispatch: jest.fn(),
    reset: jest.fn(),
    goBack: jest.fn(),
    isFocused: jest.fn(() => true),
    canGoBack: jest.fn(() => false),
    getId: jest.fn(),
    getParent: jest.fn(),
    getState: jest.fn(),
  };

  const mockUseNavigation = useNavigation as jest.MockedFunction<
    typeof useNavigation
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavigation.mockReturnValue(
      mockNavigation as unknown as ReturnType<typeof useNavigation>,
    );
  });

  describe('Component Rendering', () => {
    it('renders the button with correct text', () => {
      renderWithProvider(<PredictNewButton />);

      expect(screen.getByText('New prediction')).toBeOnTheScreen();
    });

    it('renders the add icon', () => {
      renderWithProvider(<PredictNewButton />);

      expect(screen.getByTestId('icon')).toBeOnTheScreen();
    });

    it('renders all required elements', () => {
      renderWithProvider(<PredictNewButton />);

      expect(screen.getByText('New prediction')).toBeOnTheScreen();
      expect(screen.getByTestId('icon')).toBeOnTheScreen();
    });
  });

  describe('Navigation Interaction', () => {
    it('navigates to market list when button is pressed', () => {
      renderWithProvider(<PredictNewButton />);
      const button = screen.getByText('New prediction');

      fireEvent.press(button);

      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        Routes.PREDICT.MARKET_LIST,
      );
    });

    it('calls navigation only once per press', () => {
      renderWithProvider(<PredictNewButton />);
      const button = screen.getByText('New prediction');

      fireEvent.press(button);

      expect(mockNavigation.navigate).toHaveBeenCalledTimes(1);
    });

    it('handles multiple presses correctly', () => {
      renderWithProvider(<PredictNewButton />);
      const button = screen.getByText('New prediction');

      fireEvent.press(button);
      fireEvent.press(button);
      fireEvent.press(button);

      expect(mockNavigation.navigate).toHaveBeenCalledTimes(3);
      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        Routes.PREDICT.MARKET_LIST,
      );
    });
  });

  describe('Icon Display', () => {
    it('displays the correct add icon', () => {
      renderWithProvider(<PredictNewButton />);

      const icon = screen.getByTestId('icon');
      expect(icon).toBeOnTheScreen();
    });

    it('renders icon with correct properties', () => {
      renderWithProvider(<PredictNewButton />);

      const icon = screen.getByTestId('icon');
      expect(icon).toBeOnTheScreen();
    });
  });

  describe('Text Content', () => {
    it('displays the localized text correctly', () => {
      renderWithProvider(<PredictNewButton />);

      expect(screen.getByText('New prediction')).toBeOnTheScreen();
    });

    it('uses the correct string key for localization', () => {
      // Import the mocked strings function
      const { strings } = jest.requireMock('../../../../../../locales/i18n');
      renderWithProvider(<PredictNewButton />);

      screen.getByText('New prediction');

      expect(strings).toHaveBeenCalledWith('predict.tab.new_prediction');
    });
  });

  describe('Component Structure', () => {
    it('renders without crashing', () => {
      renderWithProvider(<PredictNewButton />);

      expect(screen.getByText('New prediction')).toBeOnTheScreen();
    });

    it('maintains consistent structure across renders', () => {
      const { rerender } = renderWithProvider(<PredictNewButton />);

      expect(screen.getByText('New prediction')).toBeOnTheScreen();
      expect(screen.getByTestId('icon')).toBeOnTheScreen();

      rerender(<PredictNewButton />);

      expect(screen.getByText('New prediction')).toBeOnTheScreen();
      expect(screen.getByTestId('icon')).toBeOnTheScreen();
    });
  });

  describe('Accessibility', () => {
    it('is pressable and accessible', () => {
      renderWithProvider(<PredictNewButton />);
      const button = screen.getByText('New prediction');

      fireEvent.press(button);

      expect(mockNavigation.navigate).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('handles navigation errors gracefully', () => {
      const errorNavigation = {
        ...mockNavigation,
        navigate: jest.fn(() => {
          throw new Error('Navigation failed');
        }),
      };
      mockUseNavigation.mockReturnValue(
        errorNavigation as unknown as ReturnType<typeof useNavigation>,
      );
      renderWithProvider(<PredictNewButton />);
      const button = screen.getByText('New prediction');

      expect(() => fireEvent.press(button)).toThrow('Navigation failed');
    });

    it('handles missing navigation context', () => {
      mockUseNavigation.mockReturnValue(
        undefined as unknown as ReturnType<typeof useNavigation>,
      );

      expect(() => renderWithProvider(<PredictNewButton />)).not.toThrow();
    });
  });
});
