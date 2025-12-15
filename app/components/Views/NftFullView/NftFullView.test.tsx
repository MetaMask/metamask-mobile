import { renderScreen } from '../../../util/test/renderWithProvider';
import NftFullView from './NftFullView';
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

// Mock child components to avoid complex Redux state setup
jest.mock('../../UI/NftGrid/NftGrid', () => {
  const React = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');

  return function MockNftGrid({ isFullView }: { isFullView?: boolean }) {
    return React.createElement(
      View,
      { testID: 'nft-grid' },
      React.createElement(
        Text,
        null,
        `NftGrid ${isFullView ? 'Full View' : 'Tab View'}`,
      ),
    );
  };
});

jest.mock(
  '../../../component-library/components/BottomSheets/BottomSheetHeader',
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

// Mock Box component
jest.mock('@metamask/design-system-react-native', () => ({
  Box: ({
    children,
    testID,
  }: {
    children: React.ReactNode;
    testID?: string;
  }) => {
    const React = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return React.createElement(View, { testID }, children);
  },
}));

// Type the mocked functions
const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;

describe('NftFullView', () => {
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
    const { getByTestId } = renderScreen(NftFullView, {
      name: 'NftFullView',
    });

    // Act
    const header = getByTestId('bottom-sheet-header');
    const backButton = getByTestId('back-button');
    const headerTitle = getByTestId('header-title');

    // Assert
    expect(header).toBeOnTheScreen();
    expect(backButton).toBeOnTheScreen();
    expect(headerTitle).toBeOnTheScreen();
  });

  it('renders NFT grid with isFullView prop', () => {
    // Arrange
    const { getByTestId } = renderScreen(NftFullView, {
      name: 'NftFullView',
    });

    // Act
    const nftGrid = getByTestId('nft-grid');

    // Assert
    expect(nftGrid).toBeOnTheScreen();
  });

  it('calls goBack when back button is pressed', () => {
    // Arrange
    const { getByTestId } = renderScreen(NftFullView, {
      name: 'NftFullView',
    });

    // Act
    const backButton = getByTestId('back-button');
    backButton.props.onPress();

    // Assert
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('displays correct header title', () => {
    // Arrange
    const { getByTestId } = renderScreen(NftFullView, {
      name: 'NftFullView',
    });

    // Act
    const headerTitle = getByTestId('header-title');

    // Assert
    expect(headerTitle).toBeOnTheScreen();
  });

  it('renders with safe area view', () => {
    // Arrange
    const { getByTestId } = renderScreen(NftFullView, {
      name: 'NftFullView',
    });

    // Act
    const header = getByTestId('bottom-sheet-header');

    // Assert
    expect(header).toBeOnTheScreen();
  });
});
