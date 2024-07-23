import React from 'react';
import CollectibleContractOverview from './';
import configureMockStore from 'redux-mock-store';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { backgroundState } from '../../../util/test/initial-root-state';
import { ThemeContext } from '../../../util/theme';
import { NavigationContext } from '@react-navigation/native';

// Mocked theme context to provide colors, including error, warning, and success properties
const theme = {
  colors: {
    primary: '#000',
    background: '#fff',
    card: '#fff',
    text: '#333',
    border: '#eee',
    error: {
      default: '#B00020',
    },
    warning: {
      default: '#FFAB00',
    },
    success: {
      default: '#00C853', // Added success color with default property
    },
  },
};

// Mocked navigation context to provide navigation object
const navigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState,
  },
};
const store = mockStore(initialState);

describe('CollectibleContractOverview', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <NavigationContext.Provider value={navigation}>
        <ThemeContext.Provider value={theme}>
          <Provider store={store}>
            <CollectibleContractOverview
              collectibleContract={{
                name: 'name',
                symbol: 'symbol',
                description: 'description',
                address: '0x123',
                totalSupply: 1,
              }}
            />
          </Provider>
        </ThemeContext.Provider>
      </NavigationContext.Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
