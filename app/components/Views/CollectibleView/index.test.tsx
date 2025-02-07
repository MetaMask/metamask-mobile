import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
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
    const props = {
      navigation: {
        navigate: jest.fn(),
      },
      route: {
        params: {
          contractName: 'Test Collectible',
          address: '0xABCDEF',
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

  it('should navigate to SendFlowView when the send button is pressed', () => {
    const props = {
      navigation: {
        navigate: jest.fn(),
      },
      route: {
        params: {
          contractName: 'Test Collectible',
          address: '0xABCDEF',
        },
      },
      newAssetTransaction: jest.fn(),
    };

    const wrapper = render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <CollectibleView {...props} />
        </ThemeContext.Provider>
      </Provider>,
    );

    const sendButton = wrapper.getByTestId('send-button');
    fireEvent.press(sendButton);

    expect(props.navigation.navigate).toHaveBeenCalledWith('SendFlowView');
  });
});
