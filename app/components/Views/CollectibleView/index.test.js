// CollectibleView.snapshot.test.js
import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import CollectibleView from '.';
import configureMockStore from 'redux-mock-store';
import { backgroundState } from '../../../util/test/initial-root-state';
import { ThemeContext, mockTheme } from '../../../util/theme';

const initialState = {
  collectibles: {
    favorites: {},
  },
  engine: {
    backgroundState,
  },
};
const mockStore = configureMockStore();
const store = mockStore(initialState);

describe('CollectibleView Snapshot', () => {
  it('renders correctly', () => {
    // Create dummy props for the component
    const props = {
      navigation: {
        navigate: jest.fn(),
      },
      route: {
        params: {
          contractName: 'Test Collectible',
          address: '0xABCDEF', // This address is not in collectiblesTransferInformation, so `tradable` defaults to true
          // other collectible properties can be added here if needed
        },
      },
      newAssetTransaction: jest.fn(),
    };

    const { toJSON } = render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <CollectibleView {...props} />
        </ThemeContext.Provider>
      </Provider>,
    );

    expect(toJSON()).toMatchSnapshot();
  });
});
