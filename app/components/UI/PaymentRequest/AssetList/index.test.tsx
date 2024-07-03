import React from 'react';
import { render } from '@testing-library/react-native';
import AssetList from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import initialBackgroundState from '../../../../util/test/initial-background-state.json';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: initialBackgroundState,
  },
};
const store = mockStore(initialState);

describe('AssetList', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <AssetList
          handleSelectAsset={() => null}
          emptyMessage={'Enpty Message'}
          searchResults={[]}
        />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
