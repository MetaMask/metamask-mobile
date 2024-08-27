import React from 'react';
import { shallow } from 'enzyme';
import Approve from '.';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { backgroundState } from '../../../../../util/test/initial-root-state';

const mockStore = configureMockStore();
const initialState = {
  transaction: {},
  settings: {
    primaryCurrency: 'Fiat',
  },
  browser: {
    activeTab: 1592878266671,
    tabs: [{ id: 1592878266671, url: 'https://metamask.github.io/test-dapp/' }],
  },
  engine: {
    backgroundState,
  },
};
const store = mockStore(initialState);

describe('Approve', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <Approve />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
