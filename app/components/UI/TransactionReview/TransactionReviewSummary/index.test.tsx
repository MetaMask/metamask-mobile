import React from 'react';
import TransactionReviewSummary from './';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';
import { Provider } from 'react-redux';
import initialBackgroundState from '../../../../util/test/initial-background-state.json';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: initialBackgroundState,
  },
  settings: {
    showHexData: true,
  },
  transaction: {
    value: '',
    data: '',
    from: '0x1',
    gas: '',
    gasPrice: '',
    to: '0x2',
    selectedAsset: undefined,
    assetType: undefined,
  },
};
const store = mockStore(initialState);

describe('TransactionReviewSummary', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <TransactionReviewSummary />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
