import React from 'react';
import UrlAutocomplete from './';
import { deleteFavoriteTestId } from '../../../../wdio/screen-objects/testIDs/BrowserScreen/UrlAutocomplete.testIds';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { removeBookmark } from '../../../actions/bookmarks';

const defaultState = { browser: { history: [] }, bookmarks: [{url: 'https://www.bookmark.com', name: 'MyBookmark'}] };

describe('UrlAutocomplete', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('should render correctly', () => {
    renderWithProvider(<UrlAutocomplete />, {state: defaultState}, false);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('should show sites from dapp list', async () => {
    renderWithProvider(<UrlAutocomplete />, {state: defaultState}, false);
    screen.rerender(<UrlAutocomplete input="uni" />);
    jest.runAllTimers();
    expect(await screen.findByText('Uniswap')).toBeDefined();
  });

  it('should show sites from bookmarks', async () => {
    renderWithProvider(<UrlAutocomplete />, {state: defaultState}, false);
    screen.rerender(<UrlAutocomplete input="MyBook" />);
    jest.runAllTimers();
    const button = await screen.findByText('MyBookmark');
    expect(button).toBeDefined();
  });

  it('should delete bookmark', async () => {
    const { store } = renderWithProvider(<UrlAutocomplete />, {state: defaultState}, false);
    store.dispatch = jest.fn();
    screen.rerender(<UrlAutocomplete input="MyBook" />);
    jest.runAllTimers();
    const deleteFavorite = await screen.findByTestId(deleteFavoriteTestId(defaultState.bookmarks[0].url));
    fireEvent.press(deleteFavorite);
    expect(store.dispatch).toHaveBeenCalledWith(removeBookmark({...defaultState.bookmarks[0], type: 'favorites'}));
  });
});
