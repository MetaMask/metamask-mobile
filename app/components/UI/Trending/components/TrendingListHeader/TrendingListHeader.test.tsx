import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
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
  const { Theme } = jest.requireActual('@metamask/design-system-twrnc-preset');
  const tw = Object.assign((..._args: unknown[]) => ({}), {
    style: (..._args: unknown[]) => ({}),
  });

  return {
    Theme,
    useTailwind: () => tw,
    useTheme: () => Theme.Light,
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
    const { getByTestId, queryByPlaceholderText, queryByTestId } = render(
      <TrendingListHeader {...defaultProps} />,
    );

    const backButton = getByTestId('trending-list-header-back-button');
    const searchToggle = getByTestId('trending-list-header-search-toggle');

    expect(backButton).toBeOnTheScreen();
    expect(searchToggle).toBeOnTheScreen();
    expect(
      queryByPlaceholderText(strings('trending.search_placeholder')),
    ).toBeNull();
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
    const { getByPlaceholderText, getByTestId, queryByTestId } = render(
      <TrendingListHeader {...defaultProps} isSearchVisible />,
    );

    const searchInput = getByPlaceholderText(
      strings('trending.search_placeholder'),
    );
    const searchClose = getByTestId('trending-list-header-search-close');

    expect(searchInput).toBeOnTheScreen();
    expect(searchClose).toBeOnTheScreen();
    expect(queryByTestId('trending-list-header-back-button')).toBeNull();
  });

  it('calls onSearchQueryChange when search text changes', () => {
    const onSearchQueryChange = jest.fn();

    const { getByPlaceholderText } = render(
      <TrendingListHeader
        {...defaultProps}
        isSearchVisible
        onSearchQueryChange={onSearchQueryChange}
      />,
    );

    const searchInput = getByPlaceholderText(
      strings('trending.search_placeholder'),
    );

    fireEvent.changeText(searchInput, 'eth');

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

  it('does not call navigation.goBack when canGoBack is false and onBack is omitted', () => {
    mockCanGoBack.mockReturnValueOnce(false);

    const { getByTestId } = render(
      <TrendingListHeader {...defaultProps} onBack={undefined} />,
    );

    fireEvent.press(getByTestId('trending-list-header-back-button'));

    expect(mockCanGoBack).toHaveBeenCalledTimes(1);
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('uses localized default title when title is omitted', () => {
    const { getByTestId, getByText } = render(
      <TrendingListHeader
        {...defaultProps}
        title={undefined}
        onSearchToggle={defaultProps.onSearchToggle}
      />,
    );

    expect(getByTestId('trending-list-header')).toBeOnTheScreen();
    expect(getByText(strings('trending.trending_tokens'))).toBeOnTheScreen();
  });

  it('applies default isSearchVisible and searchQuery when omitted', () => {
    const onSearchToggle = jest.fn();
    const { queryByPlaceholderText } = render(
      <TrendingListHeader onSearchToggle={onSearchToggle} />,
    );

    expect(
      queryByPlaceholderText(strings('trending.search_placeholder')),
    ).toBeNull();
  });

  it('calls onSearchClear when search field clear is pressed', () => {
    const onSearchClear = jest.fn();
    const { getByTestId } = render(
      <TrendingListHeader
        {...defaultProps}
        isSearchVisible
        searchQuery="eth"
        onSearchClear={onSearchClear}
        onSearchQueryChange={jest.fn()}
      />,
    );

    fireEvent.press(getByTestId('trending-list-header-search-field-clear'));

    expect(onSearchClear).toHaveBeenCalledTimes(1);
  });

  it('calls onSearchQueryChange with empty string when clear pressed without onSearchClear', () => {
    const onSearchQueryChange = jest.fn();
    const { getByTestId } = render(
      <TrendingListHeader
        {...defaultProps}
        isSearchVisible
        searchQuery="eth"
        onSearchQueryChange={onSearchQueryChange}
      />,
    );

    fireEvent.press(getByTestId('trending-list-header-search-field-clear'));

    expect(onSearchQueryChange).toHaveBeenCalledWith('');
  });

  it('calls onSearchToggle when Cancel is pressed in search mode', () => {
    const onSearchToggle = jest.fn();
    const { getByText } = render(
      <TrendingListHeader
        {...defaultProps}
        isSearchVisible
        onSearchToggle={onSearchToggle}
      />,
    );

    fireEvent.press(getByText('Cancel'));

    expect(onSearchToggle).toHaveBeenCalledTimes(1);
  });

  it('does not throw when Cancel is pressed and onSearchToggle is omitted', () => {
    const { getByText } = render(
      <TrendingListHeader
        {...defaultProps}
        isSearchVisible
        onSearchToggle={undefined}
      />,
    );

    expect(() => fireEvent.press(getByText('Cancel'))).not.toThrow();
  });

  it('omits prefixed testIDs when header testID is omitted', () => {
    const { getByPlaceholderText, queryByTestId } = render(
      <TrendingListHeader isSearchVisible onSearchToggle={jest.fn()} />,
    );

    expect(
      getByPlaceholderText(strings('trending.search_placeholder')),
    ).toBeOnTheScreen();
    expect(queryByTestId('trending-list-header-search-close')).toBeNull();
  });
});
