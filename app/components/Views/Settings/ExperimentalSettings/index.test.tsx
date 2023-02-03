import React from 'react';
import { shallow } from 'enzyme';
import ExperimentalSettings from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { MAINNET } from '../../../../constants/network';
import { NetworksChainId } from '@metamask/controller-utils';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: {
      NetworkController: {
        provider: {
          type: MAINNET,
          chainId: NetworksChainId.mainnet,
        },
      },
    },
  },
};
const store = mockStore(initialState);

describe('ExperimentalSettings', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <ExperimentalSettings navigation={{}} route={{}} />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
