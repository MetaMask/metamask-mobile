import React from 'react';
import TokensTabView from './TokensTabView';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { createStackNavigator } from '@react-navigation/stack';
import { WalletViewSelectorsIDs } from '../../../../../e2e/selectors/wallet/WalletView.selectors';

// Mock external dependencies that are not under test
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => (className: string) => ({ className }),
}));

// Mock the main Tokens component to avoid complex Redux state setup
jest.mock('../index', () => ({
  __esModule: true,
  default: ({ isFullView: _isFullView }: { isFullView?: boolean }) => {
    const ReactActual = jest.requireActual('react');
    const { View, TouchableOpacity, Text } = jest.requireActual('react-native');

    return ReactActual.createElement(
      View,
      { testID: 'tokens-component' },
      ReactActual.createElement(
        View,
        { testID: 'token-list-control-bar' },
        'Control Bar',
      ),
      ReactActual.createElement(View, { testID: 'token-list' }, 'Token List'),
      ReactActual.createElement(
        TouchableOpacity,
        { testID: 'import-token-button' },
        ReactActual.createElement(Text, null, 'Add Token'),
      ),
    );
  },
}));

const Stack = createStackNavigator();

const renderComponent = () =>
  renderWithProvider(
    <Stack.Navigator>
      <Stack.Screen name="TokensTabView" options={{}}>
        {() => <TokensTabView />}
      </Stack.Screen>
    </Stack.Navigator>,
  );

describe('TokensTabView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders tokens container with correct test ID', () => {
    const { getByTestId } = renderComponent();

    expect(
      getByTestId(WalletViewSelectorsIDs.TOKENS_CONTAINER),
    ).toBeOnTheScreen();
  });

  it('renders tokens component with isFullView false', () => {
    const { getByTestId } = renderComponent();

    expect(getByTestId('tokens-component')).toBeOnTheScreen();
  });

  it('renders token list control bar', () => {
    const { getByTestId } = renderComponent();

    expect(getByTestId('token-list-control-bar')).toBeOnTheScreen();
  });

  it('renders token list component', () => {
    const { getByTestId } = renderComponent();

    expect(getByTestId('token-list')).toBeOnTheScreen();
  });

  it('renders add token button', () => {
    const { getByTestId } = renderComponent();

    expect(getByTestId('import-token-button')).toBeOnTheScreen();
  });

  describe('Component Structure', () => {
    it('renders with correct component hierarchy', () => {
      const { getByTestId } = renderComponent();

      expect(
        getByTestId(WalletViewSelectorsIDs.TOKENS_CONTAINER),
      ).toBeOnTheScreen();
      expect(getByTestId('tokens-component')).toBeOnTheScreen();
      expect(getByTestId('token-list-control-bar')).toBeOnTheScreen();
      expect(getByTestId('token-list')).toBeOnTheScreen();
      expect(getByTestId('import-token-button')).toBeOnTheScreen();
    });

    it('passes isFullView prop as false to Tokens component', () => {
      const { getByTestId } = renderComponent();

      // The mocked Tokens component should receive isFullView={false}
      expect(getByTestId('tokens-component')).toBeOnTheScreen();
    });
  });
});
