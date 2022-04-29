import React from 'react';
import { shallow } from 'enzyme';
import CollectibleContractInformation from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: {
      NetworkController: {
        provider: {
          type: 'mainnet',
        },
      },
    },
  },
};
const store = mockStore(initialState);

describe('CollectibleContractInformation', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <CollectibleContractInformation
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
    expect(wrapper.dive()).toMatchSnapshot();
  });
});
