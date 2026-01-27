import { renderScreen } from '../../../util/test/renderWithProvider';
import TokensFullView from './TokensFullView';
import { useNavigation } from '@react-navigation/native';

// Mock external dependencies that are not under test
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => {
    const tw = () => ({});
    tw.style = () => ({});
    return tw;
  },
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

// Mock Tokens component to avoid complex Redux state setup
jest.mock('../../UI/Tokens', () => {
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
      'Tokens Component',
    );
  };
});

// Type the mocked functions
const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;

describe('TokensFullView', () => {
  const mockGoBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockUseNavigation.mockReturnValue({
      goBack: mockGoBack,
    } as unknown as ReturnType<typeof useNavigation>);
  });

  it('renders header with title and back button', () => {
    // Arrange
    const { getByTestId } = renderScreen(TokensFullView, {
      name: 'TokensFullView',
    });

    // Act & Assert
    expect(getByTestId('header')).toBeOnTheScreen();
    expect(getByTestId('header-title')).toBeOnTheScreen();
    expect(getByTestId('tokens-component')).toBeOnTheScreen();
  });

  it('calls goBack when back button is pressed', () => {
    // Arrange
    const { getByTestId } = renderScreen(TokensFullView, {
      name: 'TokensFullView',
    });

    // Act
    const backButton = getByTestId('back-button');
    backButton.props.onPress();

    // Assert
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
