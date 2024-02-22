import React from 'react';
import { shallow } from 'enzyme';
import ApproveTransactionModal from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import initialBackgroundState from '../../../util/test/initial-background-state.json';

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
};
const store = mockStore(initialState);

describe('ApproveTransactionModal', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <ApproveTransactionModal />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
