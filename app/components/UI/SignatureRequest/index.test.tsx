import React from 'react';
import { shallow } from 'enzyme';
import SignatureRequest from './';
import configureMockStore from 'redux-mock-store';
import { ROPSTEN } from '../../../constants/network';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: {
      AccountTrackerController: {
        accounts: { '0x2': { balance: '0' } },
      },
      PreferencesController: {
        selectedAddress: '0x2',
        identities: { '0x2': { address: '0x2', name: 'Account 1' } },
      },
      NetworkController: {
        provider: {
          type: ROPSTEN,
        },
      },
    },
  },
};
const store = mockStore(initialState);

describe('SignatureRequest', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <SignatureRequest
          currentPageInformation={{ title: 'title', url: 'url' }}
        />
      </Provider>,
    );
    expect(wrapper.dive()).toMatchSnapshot();
  });
});
