import React from 'react';
import { render } from '@testing-library/react-native';
import AssetSearch from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: {
      TokenListController: {
        tokenList: {},
      },
    },
  },
};
const store = mockStore(initialState);

describe('AssetSearch', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <AssetSearch onSearch={() => null} />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
