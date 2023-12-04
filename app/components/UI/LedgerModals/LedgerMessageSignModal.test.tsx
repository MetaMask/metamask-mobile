import React from 'react';
import { shallow } from 'enzyme';
import LedgerMessageSignModal from './LedgerMessageSignModal';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import { RPCStageTypes } from '../../../reducers/rpcEvents';

const mockStore = configureMockStore();
const initialState = {
  rpcEvents: { signingEvent: RPCStageTypes.IDLE },
};
const store = mockStore(initialState);

describe('LedgerMessageSignModal', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <LedgerMessageSignModal />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
