import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import TrendingListHeader from './TrendingListHeader';

// Mock navigation
const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn().mockReturnValue(true);

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    canGoBack: mockCanGoBack,
  }),
}));

// Mock tailwind hook
jest.mock('@metamask/design-system-twrnc-preset', () => {
  const tw = Object.assign((..._args: unknown[]) => ({}), {
    style: (..._args: unknown[]) => ({}),
  });

  return {
    useTailwind: () => tw,
  };
});
describe('TrendingListHeader', () => {
  const defaultProps = {
    title: 'Trending Tokens',
    isSearchVisible: false,
    searchQuery: '',
    onSearchQueryChange: jest.fn(),
    onBack: jest.fn(),
    onSearchToggle: jest.fn(),
    testID: 'trending-list-header',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders back button and title when search is not visible', () => {
    const { getByTestId, queryByTestId } = render(
      <TrendingListHeader {...defaultProps} />,
    );

    const backButton = getByTestId('trending-list-header-back-button');
    const searchToggle = getByTestId('trending-list-header-search-toggle');

    expect(backButton).toBeOnTheScreen();
    expect(searchToggle).toBeOnTheScreen();
    expect(queryByTestId('trending-list-header-search-bar')).toBeNull();
  });

  it('calls onBack handler when back button is pressed', () => {
    const onBack = jest.fn();
    const { getByTestId } = render(
      <TrendingListHeader {...defaultProps} onBack={onBack} />,
    );

    const backButton = getByTestId('trending-list-header-back-button');

    fireEvent.press(backButton);

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('navigates back with default handler when onBack is not provided', () => {
    const { getByTestId } = render(
      <TrendingListHeader {...defaultProps} onBack={undefined} />,
    );

    const backButton = getByTestId('trending-list-header-back-button');

    fireEvent.press(backButton);

    expect(mockCanGoBack).toHaveBeenCalledTimes(1);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('renders search bar when search is visible', () => {
    const { getByTestId, queryByTestId } = render(
      <TrendingListHeader {...defaultProps} isSearchVisible />,
    );

    const searchBar = getByTestId('trending-list-header-search-bar');
    const searchClose = getByTestId('trending-list-header-search-close');

    expect(searchBar).toBeOnTheScreen();
    expect(searchClose).toBeOnTheScreen();
    expect(queryByTestId('trending-list-header-back-button')).toBeNull();
  });

  it('calls onSearchQueryChange when search text changes', () => {
    const onSearchQueryChange = jest.fn();

    const { getByTestId } = render(
      <TrendingListHeader
        {...defaultProps}
        isSearchVisible
        onSearchQueryChange={onSearchQueryChange}
      />,
    );

    const searchBar = getByTestId('trending-list-header-search-bar');

    fireEvent.changeText(searchBar, 'eth');

    expect(onSearchQueryChange).toHaveBeenCalledWith('eth');
  });

  it('calls onSearchToggle when search toggle button is pressed', () => {
    const onSearchToggle = jest.fn();
    const { getByTestId } = render(
      <TrendingListHeader {...defaultProps} onSearchToggle={onSearchToggle} />,
    );

    const searchToggle = getByTestId('trending-list-header-search-toggle');

    fireEvent.press(searchToggle);

    expect(onSearchToggle).toHaveBeenCalledTimes(1);
  });
});
