import React from 'react';
import UrlAutocomplete, { UrlAutocompleteRef } from './';
import { deleteFavoriteTestId } from '../../../../wdio/screen-objects/testIDs/BrowserScreen/UrlAutocomplete.testIds';
import { act, fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { removeBookmark } from '../../../actions/bookmarks';
import { noop } from 'lodash';
import { createStackNavigator } from '@react-navigation/stack';
import { TokenSearchResponseItem } from '@metamask/token-search-discovery-controller';

const defaultState = {
  browser: { history: [] },
  bookmarks: [{url: 'https://www.bookmark.com', name: 'MyBookmark'}],
  engine: {
    backgroundState: {
      PreferencesController: {
        isIpfsGatewayEnabled: false,
      },
    },
  }
};

type RenderWithProviderParams = Parameters<typeof renderWithProvider>;

jest.mock('../../hooks/useTokenSearchDiscovery/useTokenSearchDiscovery');

const Stack = createStackNavigator();
const render = (...args: RenderWithProviderParams) => {
  const Component = () => args[0];
  return renderWithProvider(
    <Stack.Navigator>
      <Stack.Screen name="UrlAutocomplete" component={Component} />
    </Stack.Navigator>,
    args[1],
    args[2],
  );
};

describe('UrlAutocomplete', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('should show sites from dapp list', async () => {
    const ref = React.createRef<UrlAutocompleteRef>();
    render(<UrlAutocomplete ref={ref} onSelect={noop} onDismiss={noop} />, {state: defaultState});

    act(() => {
      ref.current?.search('uni');
      jest.runAllTimers();
    });

    expect(await screen.findByText('Uniswap', {includeHiddenElements: true})).toBeDefined();
  });

  it('should show sites from bookmarks', async () => {
    const ref = React.createRef<UrlAutocompleteRef>();
    render(<UrlAutocomplete ref={ref} onSelect={noop} onDismiss={noop} />, {state: defaultState});

    act(() => {
      ref.current?.search('MyBook');
      jest.runAllTimers();
    });

    expect(await screen.findByText('MyBookmark', {includeHiddenElements: true})).toBeDefined();
  });

  it('should delete a bookmark when pressing the trash icon', async () => {
    const ref = React.createRef<UrlAutocompleteRef>();
    const { store } = render(<UrlAutocomplete ref={ref} onSelect={noop} onDismiss={noop} />, {state: defaultState});
    store.dispatch = jest.fn();

    act(() => {
      ref.current?.search('MyBook');
      jest.runAllTimers();
    });

    const deleteFavorite = await screen.findByTestId(deleteFavoriteTestId(defaultState.bookmarks[0].url), {includeHiddenElements: true});
    fireEvent.press(deleteFavorite);
    expect(store.dispatch).toHaveBeenCalledWith(removeBookmark({...defaultState.bookmarks[0], type: 'favorites'}));
  });

  it('should show a loading indicator when searching tokens', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const useTSD = require('../../hooks/useTokenSearchDiscovery/useTokenSearchDiscovery');
    const searchTokens = jest.fn();
    const results: TokenSearchResponseItem[] = [];
    const reset = jest.fn();
    useTSD.default.mockImplementationOnce(() => ({
      results,
      isLoading: true,
      reset,
      searchTokens,
    }));
    const ref = React.createRef<UrlAutocompleteRef>();
    render(<UrlAutocomplete ref={ref} onSelect={noop} onDismiss={noop} />, {state: defaultState});

    act(() => {
      ref.current?.search('doge');
      jest.runAllTimers();
    });

    expect(await screen.findByTestId('loading-indicator', {includeHiddenElements: true})).toBeDefined();
  });

  it('should display token search results', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const useTSD = require('../../hooks/useTokenSearchDiscovery/useTokenSearchDiscovery');
    const searchTokens = jest.fn();
    const results: TokenSearchResponseItem[] = [
      {
        tokenAddress: '0x123',
        chainId: '0x1',
        name: 'Dogecoin',
        symbol: 'DOGE',
        usdPrice: 1,
        usdPricePercentChange: {
          oneDay: 1,
        },
      }
    ];
    const reset = jest.fn();
    useTSD.default.mockImplementationOnce(() => ({
      results,
      isLoading: false,
      reset,
      searchTokens,
    }));
    const ref = React.createRef<UrlAutocompleteRef>();
    render(<UrlAutocomplete ref={ref} onSelect={noop} onDismiss={noop} />, {state: defaultState});

    act(() => {
      ref.current?.search('doge');
      jest.runAllTimers();
    });

    expect(await screen.findByText('Dogecoin', {includeHiddenElements: true})).toBeDefined();
  });
});
