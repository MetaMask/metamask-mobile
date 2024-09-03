import React from 'react';
import CollectibleContractOverview from './';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';
import { Provider } from 'react-redux';
import { backgroundState } from '../../../util/test/initial-root-state';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState,
  },
};
const store = mockStore(initialState);

describe('CollectibleContractOverview', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
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
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
