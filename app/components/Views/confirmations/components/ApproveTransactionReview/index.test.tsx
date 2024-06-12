import React from 'react';
import { shallow } from 'enzyme';
import ApproveTransactionModal from '.';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import initialBackgroundState from '../../../../../util/test/initial-background-state.json';
import { selectShouldUseSmartTransaction } from '../../../../../selectors/smartTransactionsController';

// Mock the selector module
jest.mock('../../../../../selectors/smartTransactionsController', () => ({
  ...jest.requireActual('../../../../../selectors/smartTransactionsController'),
  selectShouldUseSmartTransaction: jest.fn(),
}));

const navigationMock = {
  navigate: jest.fn(),
};

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: initialBackgroundState,
  },
  transaction: {},
  settings: {
    primaryCurrency: 'fiat',
  },
  browser: {
    activeTab: 1605778647042,
    tabs: [{ id: 1605778647042, url: 'https://metamask.github.io/test-dapp/' }],
  },
  fiatOrders: {
    networks: [
      {
        active: true,
        chainId: 1,
        chainName: 'Ethereum Mainnet',
        shortName: 'Ethereum',
        nativeTokenSupported: true,
      },
    ],
  },
};
const store = mockStore(initialState);

describe('ApproveTransactionModal', () => {
  beforeEach(() => {
    (selectShouldUseSmartTransaction as jest.Mock).mockReturnValue(false);
  });

  it('should render correctly', async () => {
    const wrapper = shallow(
      <Provider store={store}>
        <ApproveTransactionModal navigation={navigationMock} />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
