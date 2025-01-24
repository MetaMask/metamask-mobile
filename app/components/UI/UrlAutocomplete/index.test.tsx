import React from 'react';
import UrlAutocomplete, { UrlAutocompleteRef } from './';
import { deleteFavoriteTestId } from '../../../../wdio/screen-objects/testIDs/BrowserScreen/UrlAutocomplete.testIds';
import { act, fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { removeBookmark } from '../../../actions/bookmarks';
import { noop } from 'lodash';

const defaultState = { browser: { history: [] }, bookmarks: [{url: 'https://www.bookmark.com', name: 'MyBookmark'}] };

describe('UrlAutocomplete', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('should show sites from dapp list', async () => {
    const ref = React.createRef<UrlAutocompleteRef>();
    renderWithProvider(<UrlAutocomplete ref={ref} onSelect={noop} onDismiss={noop} />, {state: defaultState}, false);

    act(() => {
      ref.current?.search('uni');
      jest.runAllTimers();
    });

    expect(await screen.findByText('Uniswap', {includeHiddenElements: true})).toBeDefined();
  });

  it('should show sites from bookmarks', async () => {
    const ref = React.createRef<UrlAutocompleteRef>();
    renderWithProvider(<UrlAutocomplete ref={ref} onSelect={noop} onDismiss={noop} />, {state: defaultState}, false);

    act(() => {
      ref.current?.search('MyBook');
      jest.runAllTimers();
    });

    expect(await screen.findByText('MyBookmark', {includeHiddenElements: true})).toBeDefined();
  });

  it('should delete a bookmark when pressing the trash icon', async () => {
    const ref = React.createRef<UrlAutocompleteRef>();
    const { store } = renderWithProvider(<UrlAutocomplete ref={ref} onSelect={noop} onDismiss={noop} />, {state: defaultState}, false);
    store.dispatch = jest.fn();

    act(() => {
      ref.current?.search('MyBook');
      jest.runAllTimers();
    });

    const deleteFavorite = await screen.findByTestId(deleteFavoriteTestId(defaultState.bookmarks[0].url), {includeHiddenElements: true});
    fireEvent.press(deleteFavorite);
    expect(store.dispatch).toHaveBeenCalledWith(removeBookmark({...defaultState.bookmarks[0], type: 'favorites'}));
  });
});
