import React from 'react';
import TransactionReviewData from '.';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';
import { Provider } from 'react-redux';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import mockedEngine from '../../../../../../core/__mocks__/MockedEngine';
import { mockNetworkStateOld } from '../../../../../../util/test/network';

const mockStore = configureMockStore();

jest.mock('../../../../../../core/Engine', () => ({
  init: () => mockedEngine.init(),
}));

const initialState = {
  engine: {
    ...backgroundState,
    NetworkController: {
      ...mockNetworkStateOld({
        chainId: CHAIN_IDS.MAINNET,
        id: 'mainnet',
        nickname: 'Ethereum Mainnet',
        ticker: 'ETH',
      }),
    },
  },
  transaction: {
    transaction: {
      data: '',
    },
    value: '',
    from: '0x1',
    gas: '',
    gasPrice: '',
    to: '0x2',
    selectedAsset: undefined,
    assetType: undefined,
  },
};
const store = mockStore(initialState);

describe('TransactionReviewData', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <TransactionReviewData />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
