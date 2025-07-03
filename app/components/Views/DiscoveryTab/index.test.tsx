import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import DiscoveryTab from './DiscoveryTab';
import UrlAutocomplete from '../../UI/UrlAutocomplete';
import { SearchDiscoveryResultItem, SearchDiscoveryCategory } from '../../UI/SearchDiscoveryResult/types';
import { screen, waitFor } from '@testing-library/react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import Routes from '../../../constants/navigation/Routes';

const mockNavigation = {
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

jest.mock('../../UI/Bridge/hooks/useSwapBridgeNavigation', () => {
  const original = jest.requireActual('../../UI/Bridge/hooks/useSwapBridgeNavigation');
  return {
    ...original,
    useSwapBridgeNavigation: jest.fn().mockReturnValue({
      goToSwaps: jest.fn(),
      goToBridge: jest.fn(),
      networkModal: null,
    }),
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

const mockProps = {
  id: 1,
  showTabs: jest.fn(),
  newTab: jest.fn(),
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
      expect(screen.getByText('Popular Tokens')).toBeOnTheScreen();
    });
  });

  it('should navigate to the asset loader when selecting a token from the autocomplete', () => {
    let onSelectProp: (item: SearchDiscoveryResultItem) => void = jest.fn();
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
      category: SearchDiscoveryCategory.Tokens,
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

  it('should navigate to a site when selecting a URL from the autocomplete', () => {
    let onSelectProp: (item: SearchDiscoveryResultItem) => void = jest.fn();
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
      category: SearchDiscoveryCategory.Sites,
      name: 'Test Token',
      url: 'https://metamask.io',
    });
    expect(mockProps.newTab).toHaveBeenCalledWith('https://metamask.io');
  });
});
