import React from 'react';
import { shallow } from 'enzyme';
import Scan from './Scan';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();
const store = mockStore({});

jest.mock('react-native-ble-plx', () => ({
  BleManager: () => ({
    onStateChange: () => ({
      remove: jest.fn(),
    }),
  }),
}));

describe('Scan', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <Scan
          onDeviceSelected={jest.fn()}
          onScanningErrorStateChanged={jest.fn()}
        />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
