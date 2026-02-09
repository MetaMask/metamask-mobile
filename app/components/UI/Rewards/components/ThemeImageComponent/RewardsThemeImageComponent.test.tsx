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

  it('renders Image and ActivityIndicator on initial render', () => {
    // Arrange & Act
    const { getByTestId } = renderWithProvider(
      <RewardsThemeImageComponent themeImage={mockThemeImage} />,
    );

    // Assert
    expect(getByTestId('theme-image')).toBeOnTheScreen();
    expect(getByTestId('activity-indicator')).toBeOnTheScreen();
  });

  it('displays fallback icon when image fails to load', () => {
    // Arrange
    const { getByTestId, queryByTestId } = renderWithProvider(
      <RewardsThemeImageComponent themeImage={mockThemeImage} />,
    );

    // Act
    const image = getByTestId('theme-image');
    fireEvent(image, 'onError');

    // Assert
    expect(getByTestId('fallback-icon')).toBeOnTheScreen();
    expect(queryByTestId('theme-image')).toBeNull();
    expect(queryByTestId('activity-indicator')).toBeNull();
  });

  it('hides ActivityIndicator when image loads', () => {
    // Arrange
    const { getByTestId, queryByTestId } = renderWithProvider(
      <RewardsThemeImageComponent themeImage={mockThemeImage} />,
    );

    // Act
    const image = getByTestId('theme-image');
    fireEvent(image, 'onLoad');

    // Assert
    expect(queryByTestId('activity-indicator')).toBeNull();
    expect(getByTestId('theme-image')).toBeOnTheScreen();
  });

  it('uses default resizeMode of contain', () => {
    // Arrange & Act
    const { getByTestId } = renderWithProvider(
      <RewardsThemeImageComponent themeImage={mockThemeImage} />,
    );

    // Assert
    const image = getByTestId('theme-image');
    expect(image.props.resizeMode).toBe('contain');
  });

  it('applies custom resizeMode when provided', () => {
    // Arrange & Act
    const { getByTestId } = renderWithProvider(
      <RewardsThemeImageComponent
        themeImage={mockThemeImage}
        resizeMode="cover"
      />,
    );

    // Assert
    const image = getByTestId('theme-image');
    expect(image.props.resizeMode).toBe('cover');
  });

  it('applies custom style when provided', () => {
    // Arrange
    const customStyle = { width: 100, height: 100, borderRadius: 8 };

    // Act
    const { getByTestId } = renderWithProvider(
      <RewardsThemeImageComponent
        themeImage={mockThemeImage}
        style={customStyle}
      />,
    );

    // Assert
    const image = getByTestId('theme-image');
    expect(image.props.style).toEqual(customStyle);
  });

  it('transitions from loading to loaded state', () => {
    // Arrange
    const { getByTestId, queryByTestId } = renderWithProvider(
      <RewardsThemeImageComponent themeImage={mockThemeImage} />,
    );
    expect(getByTestId('activity-indicator')).toBeOnTheScreen();

    // Act
    const image = getByTestId('theme-image');
    fireEvent(image, 'onLoad');

    // Assert
    expect(queryByTestId('activity-indicator')).toBeNull();
    expect(queryByTestId('fallback-icon')).toBeNull();
    expect(getByTestId('theme-image')).toBeOnTheScreen();
  });

  it('transitions from loading to error state', () => {
    // Arrange
    const { getByTestId, queryByTestId } = renderWithProvider(
      <RewardsThemeImageComponent themeImage={mockThemeImage} />,
    );
    expect(getByTestId('activity-indicator')).toBeOnTheScreen();

    // Act
    const image = getByTestId('theme-image');
    fireEvent(image, 'onError');

    // Assert
    expect(queryByTestId('activity-indicator')).toBeNull();
    expect(getByTestId('fallback-icon')).toBeOnTheScreen();
    expect(queryByTestId('theme-image')).toBeNull();
  });
});
