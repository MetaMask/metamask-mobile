import React from 'react';
import TransactionReviewData from '.';
import configureMockStore from 'redux-mock-store';
import { shallow } from 'enzyme';
import { Provider } from 'react-redux';
import { backgroundState } from '../../../../../../../util/test/initial-root-state';

const mockStore = configureMockStore();

const initialState = {
  engine: {
    backgroundState,
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
