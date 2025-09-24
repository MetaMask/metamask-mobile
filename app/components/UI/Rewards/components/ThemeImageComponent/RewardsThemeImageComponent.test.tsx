/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import { ThemeImage } from '../../../../../core/Engine/controllers/rewards-controller/types';

// Create a simple Redux store for testing
const mockStore = createStore(() => ({
  user: {
    appTheme: 'light',
  },
}));

// Mock theme
const mockUseTheme = jest.fn();

jest.mock('../../../../../util/theme', () => ({
  useTheme: mockUseTheme,
  useAssetFromTheme: jest.requireActual('../../../../../util/theme')
    .useAssetFromTheme,
}));

import RewardsThemeImageComponent from './RewardsThemeImageComponent';

// Helper function to render with Redux Provider
const renderWithProvider = (component: React.ReactElement) =>
  render(<Provider store={mockStore}>{component}</Provider>);

jest.mock('@metamask/design-system-react-native', () => ({
  Box: ({ children, testID, ...props }: any) => {
    const MockReact = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return MockReact.createElement(View, { testID, ...props }, children);
  },
  Icon: ({ testID }: any) => {
    const MockReact = jest.requireActual('react');
    const { View, Text } = jest.requireActual('react-native');
    return MockReact.createElement(
      View,
      { testID },
      MockReact.createElement(Text, null, 'Icon'),
    );
  },
  IconName: {
    Image: 'Image',
  },
  IconSize: {
    Lg: 'Lg',
  },
}));

describe('RewardsThemeImageComponent', () => {
  const mockThemeImage: ThemeImage = {
    lightModeUrl: 'https://example.com/light.png',
    darkModeUrl: 'https://example.com/dark.png',
  };

  const mockTheme = {
    colors: {
      primary: {
        default: '#037DD6',
      },
    },
    themeAppearance: 'light',
    brandColors: {},
    typography: {},
    shadows: {},
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTheme.mockReturnValue(mockTheme);
  });

  it('renders successfully with required props', () => {
    // Arrange & Act
    const { getByTestId } = renderWithProvider(
      <RewardsThemeImageComponent themeImage={mockThemeImage} />,
    );

    // Assert
    expect(getByTestId('activity-indicator')).toBeOnTheScreen();
  });

  it('renders with theme image URLs', () => {
    // Arrange & Act
    const { getByTestId } = renderWithProvider(
      <RewardsThemeImageComponent themeImage={mockThemeImage} />,
    );

    // Assert
    expect(getByTestId('theme-image')).toBeOnTheScreen();
  });

  it('shows ActivityIndicator during initial loading state', () => {
    // Arrange & Act
    const { getByTestId } = renderWithProvider(
      <RewardsThemeImageComponent themeImage={mockThemeImage} />,
    );

    // Assert
    expect(getByTestId('activity-indicator')).toBeOnTheScreen();
  });

  it('shows fallback icon when image fails to load', () => {
    // Arrange
    const { getByTestId } = renderWithProvider(
      <RewardsThemeImageComponent themeImage={mockThemeImage} />,
    );

    // Act
    const image = getByTestId('theme-image');
    fireEvent(image, 'onError');

    // Assert
    expect(getByTestId('fallback-icon')).toBeOnTheScreen();
  });

  it('hides loading indicator when image loads successfully', () => {
    // Arrange
    const { getByTestId, queryByTestId } = renderWithProvider(
      <RewardsThemeImageComponent themeImage={mockThemeImage} />,
    );

    // Act
    const image = getByTestId('theme-image');
    fireEvent(image, 'onLoad');

    // Assert
    expect(queryByTestId('activity-indicator')).toBeNull();
  });

  it('shows loading indicator when image starts loading', () => {
    // Arrange
    const { getByTestId } = renderWithProvider(
      <RewardsThemeImageComponent themeImage={mockThemeImage} />,
    );

    // Act
    const image = getByTestId('theme-image');
    fireEvent(image, 'onLoadStart');

    // Assert
    expect(getByTestId('activity-indicator')).toBeOnTheScreen();
  });

  it('uses correct resizeMode for image', () => {
    // Arrange & Act
    const { getByTestId } = renderWithProvider(
      <RewardsThemeImageComponent themeImage={mockThemeImage} />,
    );

    // Assert
    const image = getByTestId('theme-image');
    expect(image.props.resizeMode).toBe('contain');
  });

  it('handles state transitions correctly from loading to loaded', () => {
    // Arrange
    const { getByTestId, queryByTestId } = renderWithProvider(
      <RewardsThemeImageComponent themeImage={mockThemeImage} />,
    );

    // Act - initial loading state
    expect(getByTestId('activity-indicator')).toBeOnTheScreen();

    // Act - image loads
    const image = getByTestId('theme-image');
    fireEvent(image, 'onLoad');

    // Assert
    expect(queryByTestId('activity-indicator')).toBeNull();
    expect(queryByTestId('fallback-icon')).toBeNull();
  });

  it('handles state transitions correctly from loading to error', () => {
    // Arrange
    const { getByTestId, queryByTestId } = renderWithProvider(
      <RewardsThemeImageComponent themeImage={mockThemeImage} />,
    );

    // Act - initial loading state
    expect(getByTestId('activity-indicator')).toBeOnTheScreen();

    // Act - image fails to load
    const image = getByTestId('theme-image');
    fireEvent(image, 'onError');

    // Assert
    expect(queryByTestId('activity-indicator')).toBeNull();
    expect(getByTestId('fallback-icon')).toBeOnTheScreen();
  });

  it('handles re-loading when onLoadStart is called after successful load', () => {
    // Arrange
    const { getByTestId, queryByTestId } = renderWithProvider(
      <RewardsThemeImageComponent themeImage={mockThemeImage} />,
    );
    const image = getByTestId('theme-image');

    // Act - initial load success
    fireEvent(image, 'onLoad');
    expect(queryByTestId('activity-indicator')).toBeNull();

    // Act - start loading again
    fireEvent(image, 'onLoadStart');

    // Assert
    expect(getByTestId('activity-indicator')).toBeOnTheScreen();
  });
});
