import React from 'react';
import { shallow } from 'enzyme';
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
    const wrapper = shallow(
      <Provider store={store}>
        <AssetSearch onSearch={() => null} />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
