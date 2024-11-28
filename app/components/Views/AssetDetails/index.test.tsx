import React from 'react';
import AssetDetails from './';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';
import { Provider } from 'react-redux';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { backgroundState } from '../../../util/test/initial-root-state';
import { mockNetworkState } from '../../../util/test/network';

const mockStore = configureMockStore();

const initialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      NetworkController: {
        ...mockNetworkState({
          chainId: CHAIN_IDS.MAINNET,
          id: 'mainnet',
          nickname: 'Ethereum Mainnet',
          ticker: 'ETH',
        }),
      },
    },
  },
};
const store = mockStore(initialState);

describe('AssetsDetails', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <AssetDetails
          route={{
            params: {
              address: '0xAddress.',
            },
          }}
        />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
