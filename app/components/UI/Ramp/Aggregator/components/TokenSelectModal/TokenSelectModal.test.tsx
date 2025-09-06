import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import TokenSelectModal, { createTokenSelectModalNavigationDetails } from './TokenSelectModal';
import { CryptoCurrency } from '@consensys/on-ramp-sdk';

const mockTokens: CryptoCurrency[] = [
  {
    id: '1',
    symbol: 'ETH',
    name: 'Ethereum',
    logo: 'https://example.com/eth.png',
    address: '0x0000000000000000000000000000000000000000',
    decimals: 18,
    network: {
      chainId: '0x1',
      shortName: 'Ethereum',
    },
  } as CryptoCurrency,
  {
    id: '2',
    symbol: 'USDC',
    name: 'USD Coin',
    logo: 'https://example.com/usdc.png',
    address: '0xA0b86a33E6441b8c4C8C0C8C0C8C0C8C0C8C0C8C',
    decimals: 6,
    network: {
      chainId: '0x1',
      shortName: 'Ethereum',
    },
  } as CryptoCurrency,
];

const Stack = createStackNavigator();

const TestNavigator = () => (
  <NavigationContainer>
    <Stack.Navigator>
      <Stack.Screen
        name="TestScreen"
        component={() => null}
        initialParams={{
          tokens: mockTokens,
        }}
      />
      <Stack.Screen name="TokenSelectModal" component={TokenSelectModal} />
    </Stack.Navigator>
  </NavigationContainer>
);

describe('TokenSelectModal', () => {
  it('render should match snapshot', () => {
    const { toJSON } = render(<TestNavigator />);
    expect(toJSON()).toMatchSnapshot();
  });
});

describe('createTokenSelectModalNavigationDetails', () => {
  it('create navigation details with correct route', () => {
    const navigationDetails = createTokenSelectModalNavigationDetails({
      tokens: mockTokens,
    });

    expect(navigationDetails).toEqual([
      'RampModals',
      {
        params: {
          tokens: mockTokens,
        },
        screen: 'RampTokenSelectorModal',
      },
    ]);
  });
});
