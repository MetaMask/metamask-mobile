import React from 'react';
import Approval from './';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';
import { Provider } from 'react-redux';
import initialBackgroundState from '../../../util/test/initial-background-state.json';

const mockStore = configureMockStore();
const initialState = {
  settings: {
    showCustomNonce: false,
  },
  transaction: {
    value: '',
    data: '',
    from: '0x1',
    gas: '',
    gasPrice: '',
    to: '0x2',
    selectedAsset: { symbol: 'ETH' },
    assetType: undefined,
  },
  engine: {
    backgroundState: initialBackgroundState,
  },
};
const store = mockStore(initialState);
const navigation = { state: { params: { address: '0x1' } } } as any;
// noop
navigation.setParams = (params: any) => ({ ...params });

describe('Approval', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <Approval navigation={navigation} />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
