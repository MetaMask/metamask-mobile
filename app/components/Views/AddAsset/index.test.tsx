import React from 'react';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';
import AddAsset from './';
import { Provider } from 'react-redux';
import initialBackgroundState from '../../../util/test/initial-background-state.json';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: initialBackgroundState,
  },
};
const store = mockStore(initialState);

describe('AddAsset', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <AddAsset route={{ params: { assetType: 'token' } }} />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
