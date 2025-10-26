import { renderScreen } from '../../../util/test/renderWithProvider';
import NftFullView from './NftFullView';

// Mock external dependencies that are not under test
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => (className: string) => ({ className }),
}));

jest.mock('../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(),
  }),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    push: jest.fn(),
    goBack: jest.fn(),
  }),
}));

describe('NftFullView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it('renders control bar with add collectible button', () => {
    // Arrange
    const { getByTestId } = renderScreen(NftFullView, {
      name: 'NftFullView',
    });

    // Act
    const controlBar = getByTestId('base-control-bar');
    const addButton = getByTestId('import-token-button');

    // Assert
    expect(controlBar).toBeOnTheScreen();
    expect(addButton).toBeOnTheScreen();
  });

  it('renders NFT grid', () => {
    // Arrange
    const { getByTestId } = renderScreen(NftFullView, {
      name: 'NftFullView',
    });

    // Act
    const nftGrid = getByTestId('nft-grid');

    // Assert
    expect(nftGrid).toBeOnTheScreen();
  });

  it('handles back button press', () => {
    // Arrange
    const mockGoBack = jest.fn();
    jest.doMock('@react-navigation/native', () => ({
      ...jest.requireActual('@react-navigation/native'),
      useNavigation: () => ({
        push: jest.fn(),
        goBack: mockGoBack,
      }),
    }));

    const { getByTestId } = renderScreen(NftFullView, {
      name: 'NftFullView',
    });

    // Act
    const backButton = getByTestId('back-button');
    backButton.props.onPress();

    // Assert
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('handles add collectible button press', () => {
    // Arrange
    const mockPush = jest.fn();
    const mockTrackEvent = jest.fn();
    const mockCreateEventBuilder = jest.fn(() => ({
      build: jest.fn(),
    }));

    jest.doMock('@react-navigation/native', () => ({
      ...jest.requireActual('@react-navigation/native'),
      useNavigation: () => ({
        push: mockPush,
        goBack: jest.fn(),
      }),
    }));

    jest.doMock('../../hooks/useMetrics', () => ({
      useMetrics: () => ({
        trackEvent: mockTrackEvent,
        createEventBuilder: mockCreateEventBuilder,
      }),
    }));

    const { getByTestId } = renderScreen(NftFullView, {
      name: 'NftFullView',
    });

    // Act
    const addButton = getByTestId('import-token-button');
    addButton.props.onPress();

    // Assert
    expect(mockPush).toHaveBeenCalledWith('AddAsset', {
      assetType: 'collectible',
    });
    expect(mockCreateEventBuilder).toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it('renders with safe area view', () => {
    // Arrange
    const { getByTestId } = renderScreen(NftFullView, {
      name: 'NftFullView',
    });

    // Act
    const safeAreaView = getByTestId('safe-area-view');

    // Assert
    expect(safeAreaView).toBeOnTheScreen();
  });

  it('displays correct header title', () => {
    // Arrange
    const { getByText } = renderScreen(NftFullView, {
      name: 'NftFullView',
    });

    // Act
    const headerTitle = getByText('wallet.collectibles');

    // Assert
    expect(headerTitle).toBeOnTheScreen();
  });
});
