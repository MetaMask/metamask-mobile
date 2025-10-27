import { renderScreen } from '../../../util/test/renderWithProvider';
import TokensFullView from './TokensFullView';
import { useNavigation } from '@react-navigation/native';
import { useMetrics } from '../../hooks/useMetrics';

// Mock external dependencies that are not under test
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => (className: string) => ({ className }),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

jest.mock('../../../../components/hooks/useMetrics', () => ({
  useMetrics: jest.fn(),
}));

// Mock child components to avoid complex Redux state setup
jest.mock(
  '../../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => {
    const React = jest.requireActual('react');
    const { View, TouchableOpacity, Text } = jest.requireActual('react-native');

    return function MockBottomSheetHeader({
      onBack,
      children,
    }: {
      onBack: () => void;
      children: string;
    }) {
      return React.createElement(
        View,
        { testID: 'bottom-sheet-header' },
        React.createElement(
          TouchableOpacity,
          { testID: 'back-button', onPress: onBack },
          React.createElement(Text, null, 'Back'),
        ),
        React.createElement(Text, { testID: 'header-title' }, children),
      );
    };
  },
);

jest.mock('../index', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return function MockTokens({
    isFullView: _isFullView,
  }: {
    isFullView?: boolean;
  }) {
    return React.createElement(
      View,
      { testID: 'tokens-component' },
      React.createElement(
        View,
        { testID: 'token-list-control-bar' },
        'Control Bar',
      ),
      React.createElement(View, { testID: 'token-list' }, 'Token List'),
    );
  };
});

// Type the mocked functions
const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;
const mockUseMetrics = useMetrics as jest.MockedFunction<typeof useMetrics>;

describe('TokensFullView', () => {
  const mockGoBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockUseNavigation.mockReturnValue({
      goBack: mockGoBack,
    } as unknown as ReturnType<typeof useNavigation>);

    mockUseMetrics.mockReturnValue({
      trackEvent: jest.fn(),
      createEventBuilder: jest.fn(),
    } as unknown as ReturnType<typeof useMetrics>);
  });

  it('renders header with title and back button', () => {
    const { getByTestId } = renderScreen(TokensFullView, {
      name: 'TokensFullView',
    });

    expect(getByTestId('bottom-sheet-header')).toBeOnTheScreen();
    expect(getByTestId('header-title')).toBeOnTheScreen();
    expect(getByTestId('back-button')).toBeOnTheScreen();
  });

  it('renders tokens component with isFullView prop', () => {
    const { getByTestId } = renderScreen(TokensFullView, {
      name: 'TokensFullView',
    });

    expect(getByTestId('tokens-component')).toBeOnTheScreen();
  });

  it('renders token list control bar', () => {
    const { getByTestId } = renderScreen(TokensFullView, {
      name: 'TokensFullView',
    });

    expect(getByTestId('token-list-control-bar')).toBeOnTheScreen();
  });

  it('renders token list component', () => {
    const { getByTestId } = renderScreen(TokensFullView, {
      name: 'TokensFullView',
    });

    expect(getByTestId('token-list')).toBeOnTheScreen();
  });

  it('calls goBack when back button is pressed', () => {
    const { getByTestId } = renderScreen(TokensFullView, {
      name: 'TokensFullView',
    });

    const backButton = getByTestId('back-button');
    backButton.props.onPress();

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('displays correct header title', () => {
    const { getByTestId } = renderScreen(TokensFullView, {
      name: 'TokensFullView',
    });

    const headerTitle = getByTestId('header-title');
    expect(headerTitle).toBeOnTheScreen();
  });
});
