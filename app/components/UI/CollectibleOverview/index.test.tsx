import React from 'react';
import CollectibleOverview from './';
import configureMockStore from 'redux-mock-store';
import { render, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { backgroundState } from '../../../util/test/initial-root-state';
import { ThemeContext, mockTheme } from '../../../util/theme';

const mockStore = configureMockStore();
const initialState = {
  collectibles: {
    favorites: {},
  },
  engine: {
    backgroundState,
  },
};
const store = mockStore(initialState);

describe('CollectibleOverview', () => {
  it('should render correctly', () => {
    render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <CollectibleOverview
            collectible={{
              name: 'Leopard',
              tokenId: 6904,
              address: '0x06012c8cf97BEaD5deAe237070F9587f8E7A266d',
              externalLink: 'https://nft.example.com',
              tradable: true,
            }}
            openLink={jest.fn()}
          />
        </ThemeContext.Provider>
      </Provider>,
    );
    expect(screen.getByText('Leopard')).toBeOnTheScreen();
  });
});
