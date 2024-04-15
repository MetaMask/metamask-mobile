import React from 'react';
import { View } from 'react-native';
import { shallow } from 'enzyme';
import LedgerConnect from '.';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();
const store = mockStore({});

jest.mock('@ledgerhq/react-native-hw-transport-ble', () => null);

jest.mock('../../../core/Engine', () => ({
  context: {
    KeyringController: {
      state: {
        keyrings: [],
      },
    },
  },
}));

jest.doMock('./Scan', () => () => <View>Scan</View>);

describe('LedgerConnect', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <LedgerConnect />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
