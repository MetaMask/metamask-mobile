import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import DefaultUrlAutocomplete, { UrlAutocomplete, deleteFavoriteTestId } from './';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { mockTheme, ThemeContext } from '../../../util/theme';

const bookmarks = [{url: 'https://www.bookmark.com', name: 'MyBookmark', type: 'favorites'}];

describe('UrlAutocomplete', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('should render correctly', () => {
    renderWithProvider(<DefaultUrlAutocomplete />, {});
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('should show sites from dapp list', async () => {
    render(<UrlAutocomplete browserHistory={[]} bookmarks={[]} />, { wrapper: ({ children }) => <ThemeContext.Provider value={mockTheme}>{children}</ThemeContext.Provider>});
    screen.rerender(<UrlAutocomplete input="uni" browserHistory={[]} bookmarks={[]} />);
    jest.runAllTimers();
    expect(await screen.findByText('Uniswap')).toBeDefined();
  });

  it('should show sites from bookmarks', async () => {
    render(<UrlAutocomplete browserHistory={[]} bookmarks={bookmarks} />, { wrapper: ({ children }) => <ThemeContext.Provider value={mockTheme}>{children}</ThemeContext.Provider>});
    screen.rerender(<UrlAutocomplete input="MyBook" browserHistory={[]} bookmarks={bookmarks} />);
    jest.runAllTimers();
    const button = await screen.findByText('MyBookmark');
    expect(button).toBeDefined();
  });

  it('should delete bookmark', async () => {
    const removeBookmark = jest.fn();
    render(<UrlAutocomplete removeBookmark={removeBookmark} browserHistory={[]} bookmarks={bookmarks} />, { wrapper: ({ children }) => <ThemeContext.Provider value={mockTheme}>{children}</ThemeContext.Provider>});
    screen.rerender(<UrlAutocomplete input="MyBook" removeBookmark={removeBookmark} browserHistory={[]} bookmarks={bookmarks} />);
    jest.runAllTimers();
    const deleteFavorite = await screen.findByTestId(deleteFavoriteTestId(bookmarks[0].url));
    fireEvent.press(deleteFavorite);
    const {url, name} = bookmarks[0];
    expect(removeBookmark).toHaveBeenCalledWith({url, name});
  });
});
