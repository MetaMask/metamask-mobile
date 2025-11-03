import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import PredictPositionEmpty from './PredictPositionEmpty';
import Routes from '../../../../../constants/navigation/Routes';
import renderWithProvider from '../../../../../util/test/renderWithProvider';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const { View, Text } = jest.requireActual('react-native');
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
      variant,
      ...props
    }: {
      children: React.ReactNode;
      variant?: string;
      [key: string]: unknown;
    }) => (
      <Text testID={props.testID} {...props}>
        {children}
      </Text>
    ),
    TextVariant: {
      HeadingMd: 'heading-md',
      BodyMd: 'body-md',
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
      Details: 'details',
    },
    IconSize: {
      XXL: 'xxl',
    },
    IconColor: {
      Muted: 'muted',
    },
  };
});

jest.mock('../../../../../component-library/components/Buttons/Button', () => {
  const { TouchableOpacity, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      onPress,
      label,
      testID,
      ...props
    }: {
      onPress: () => void;
      label: string;
      testID?: string;
      [key: string]: unknown;
    }) => (
      <TouchableOpacity
        testID={testID || 'button'}
        onPress={onPress}
        {...props}
      >
        <Text>{label}</Text>
      </TouchableOpacity>
    ),
    ButtonSize: {
      Lg: 'lg',
    },
    ButtonVariants: {
      Primary: 'primary',
    },
  };
});

jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: jest.fn(() => ({
    styles: {
      emptyState: {},
      emptyStateIcon: {},
      emptyStateTitle: {},
      emptyStateDescription: {},
      exploreMarketsButton: {},
    },
  })),
}));

describe('PredictPositionEmpty', () => {
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

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders the empty state with all required elements', () => {
      renderWithProvider(<PredictPositionEmpty />);

      expect(
        screen.getByText(
          'Your predictions will appear here, showing your stake and market movement.',
        ),
      ).toBeOnTheScreen();
      expect(screen.getByText('Browse markets')).toBeOnTheScreen();
      expect(screen.getByTestId('icon')).toBeOnTheScreen();
    });

    it('renders the browse markets button', () => {
      renderWithProvider(<PredictPositionEmpty />);

      const browseButton = screen.getByText('Browse markets');
      expect(browseButton).toBeOnTheScreen();
    });
  });

  describe('Navigation Interaction', () => {
    it('navigates to market list when browse button is pressed', () => {
      renderWithProvider(<PredictPositionEmpty />);

      const browseButton = screen.getByText('Browse markets');
      fireEvent.press(browseButton);

      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        Routes.PREDICT.ROOT,
        {
          screen: Routes.PREDICT.MARKET_LIST,
        },
      );
    });
  });

  describe('Content Display', () => {
    it('displays the correct empty state description', () => {
      renderWithProvider(<PredictPositionEmpty />);

      expect(
        screen.getByText(
          'Your predictions will appear here, showing your stake and market movement.',
        ),
      ).toBeOnTheScreen();
    });

    it('displays the correct button text', () => {
      renderWithProvider(<PredictPositionEmpty />);

      expect(screen.getByText('Browse markets')).toBeOnTheScreen();
    });

    it('displays the sparkle icon', () => {
      renderWithProvider(<PredictPositionEmpty />);

      const icon = screen.getByTestId('icon');
      expect(icon).toBeOnTheScreen();
    });
  });
});
