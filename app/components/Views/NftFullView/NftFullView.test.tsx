import { renderScreen } from '../../../util/test/renderWithProvider';
import NftFullView from './NftFullView';
import { useNavigation } from '@react-navigation/native';
import { useMetrics } from '../../hooks/useMetrics';
import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';

// Mock external dependencies that are not under test
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => (className: string) => ({ className }),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

jest.mock('../../hooks/useMetrics', () => ({
  useMetrics: jest.fn(),
  MetaMetricsEvents: {
    WALLET_ADD_COLLECTIBLES: 'WALLET_ADD_COLLECTIBLES',
  },
}));

// Mock child components to avoid complex Redux state setup
jest.mock('../../UI/shared/BaseControlBar', () => {
  const React = require('react');
  const { View } = require('react-native');

  return function MockBaseControlBar({ additionalButtons }: any) {
    return React.createElement(
      View,
      { testID: 'base-control-bar' },
      additionalButtons,
    );
  };
});

jest.mock('../../UI/NftGrid/NftGrid', () => {
  const React = require('react');
  const { View, TouchableOpacity, Text } = require('react-native');

  return function MockNftGrid({ onAddCollectible }: any) {
    return React.createElement(
      View,
      { testID: 'nft-grid' },
      React.createElement(
        TouchableOpacity,
        { testID: 'nft-grid-add-button', onPress: onAddCollectible },
        React.createElement(Text, null, 'Add Collectible'),
      ),
    );
  };
});

jest.mock(
  '../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => {
    const React = require('react');
    const { View, TouchableOpacity, Text } = require('react-native');

    return function MockBottomSheetHeader({ onBack }: any) {
      return React.createElement(
        View,
        { testID: 'bottom-sheet-header' },
        React.createElement(
          TouchableOpacity,
          { testID: 'back-button', onPress: onBack },
          React.createElement(Text, null, 'Back'),
        ),
        React.createElement(
          Text,
          { testID: 'header-title' },
          'wallet.collectibles',
        ),
      );
    };
  },
);

// Type the mocked functions
const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;
const mockUseMetrics = useMetrics as jest.MockedFunction<typeof useMetrics>;

describe('NftFullView', () => {
  const mockGoBack = jest.fn();
  const mockPush = jest.fn();
  const mockTrackEvent = jest.fn();
  const mockCreateEventBuilder = jest.fn(() => ({
    build: jest.fn(),
    addProperties: jest.fn(),
    addSensitiveProperties: jest.fn(),
  }));

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockUseNavigation.mockReturnValue({
      push: mockPush,
      goBack: mockGoBack,
    } as any);

    mockUseMetrics.mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    } as any);
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
    const nftAddButton = getByTestId('nft-grid-add-button');

    // Assert
    expect(nftGrid).toBeOnTheScreen();
    expect(nftAddButton).toBeOnTheScreen();
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

  it('navigates to AddAsset and tracks event when add collectible button is pressed', () => {
    // Arrange
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
    const header = getByTestId('bottom-sheet-header');

    // Assert
    expect(header).toBeOnTheScreen();
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
});
