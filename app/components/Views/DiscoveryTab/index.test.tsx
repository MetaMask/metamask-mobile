import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import DiscoveryTab from './DiscoveryTab';
import UrlAutocomplete, { AutocompleteSearchResult, UrlAutocompleteCategory } from '../../UI/UrlAutocomplete';
import { screen, waitFor } from '@testing-library/react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import Routes from '../../../constants/navigation/Routes';

const mockNavigation = {
//   goBack: jest.fn(),
//   goForward: jest.fn(),
//   canGoBack: true,
//   canGoForward: true,
//   addListener: jest.fn(),
  navigate: jest.fn(),
};

jest.mock('../../UI/BrowserBottomBar', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue('BrowserBottomBar'),
}));

jest.mock('../../UI/BrowserUrlBar', () => ({
  __esModule: true,
  ...jest.requireActual('../../UI/BrowserUrlBar'),
  default: jest.fn().mockReturnValue('BrowserUrlBar'),
}));

jest.mock('../../UI/UrlAutocomplete', () => ({
  __esModule: true,
  ...jest.requireActual('../../UI/UrlAutocomplete'),
  default: jest.fn().mockReturnValue('UrlAutocomplete'),
}));

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => mockNavigation,
    useIsFocused: () => true,
  };
});

const mockInitialState = {
  browser: {
    activeTab: 1,
    history: [],
    tabs: [
      {
        id: 1,
        url: 'https://metamask.io',
        image: '',
        isArchived: false,
      }
    ],
  },
  bookmarks: [],
  engine: {
    backgroundState,
  },
};

// jest.mock('../../../core/Engine', () => ({
//   context: {
//     PhishingController: {
//       maybeUpdateState: jest.fn(),
//       test: () => ({ result: true, name: 'test' }),
//     },
//     CurrencyRateController: {
//       updateExchangeRate: jest.fn(() => Promise.resolve()),
//     },
//   },
// }));

const mockProps = {
  id: 1,
  updateTabInfo: jest.fn(),
  showTabs: jest.fn(),
};

const Stack = createStackNavigator();

describe('DiscoveryTab', () => {

  it('should render correctly', async () => {
    renderWithProvider(
      <NavigationContainer independent>
        <Stack.Navigator>
          <Stack.Screen name="Browser">
            {() => <DiscoveryTab {...mockProps} />}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>,
      { state: mockInitialState }
    );
    await waitFor(() => {
      expect(screen.getByText('Token Discovery placeholder')).toBeOnTheScreen();
    });
  });

  it('should navigate to the asset loader when selecting a token from the autocomplete', () => {
    let onSelectProp: (item: AutocompleteSearchResult) => void = jest.fn();
    jest.mocked(UrlAutocomplete).mockImplementation(({ onSelect }) => {
      onSelectProp = onSelect;
      return 'UrlAutocomplete';
    });
    renderWithProvider(
      <NavigationContainer independent>
        <Stack.Navigator>
          <Stack.Screen name="Browser">
            {() => <DiscoveryTab {...mockProps} />}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>,
      { state: mockInitialState }
    );
    onSelectProp?.({
      category: UrlAutocompleteCategory.Tokens,
      address: '0x123',
      chainId: '0x1',
      name: 'Test Token',
      symbol: 'TEST',
      decimals: 18,
      price: 100,
      percentChange: 100,
      isFromSearch: true,
    });
    expect(mockNavigation.navigate).toHaveBeenCalledWith(Routes.BROWSER.ASSET_LOADER, {
      chainId: '0x1',
      address: '0x123',
    });
  });
});
