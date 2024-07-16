jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

import React from 'react';
import CollectibleContractOverview from './';
import configureMockStore from 'redux-mock-store';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { backgroundState } from '../../../util/test/initial-root-state';
import { ThemeContext } from '../../../util/theme';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState,
  },
};
const store = mockStore(initialState);

const mockTheme = {
  colors: {
    text: { default: '#000000' },
    border: { muted: '#CCCCCC' },
    background: { default: '#FFFFFF' },
    error: { default: '#FF0000' },
    warning: { default: '#FFA500' },
    success: { default: '#00FF00' },
    primary: { default: '#037DD6' },
    secondary: { default: '#F2F4F6' },
    info: { default: '#0376C9' },
  },
};

describe('CollectibleContractOverview', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <CollectibleContractOverview
            collectibleContract={{
              name: 'name',
              symbol: 'symbol',
              description: 'description',
              address: '0x123',
              totalSupply: 1,
            }}
          />
        </ThemeContext.Provider>
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
