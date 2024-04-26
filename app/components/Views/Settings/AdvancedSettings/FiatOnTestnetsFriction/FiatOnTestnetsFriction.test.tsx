import React from 'react';
import { render } from '@testing-library/react-native';
import FiatOnTestnetsFriction from './FiatOnTestnetsFriction';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

const store = configureMockStore()({});
jest.mock('@react-navigation/native');
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn().mockImplementation(() => ({})),
  useSafeAreaFrame: jest.fn().mockImplementation(() => ({})),
}));

describe('Show fiat on testnets friction bottom sheet', () => {
  it('should render', () => {
    const wrapper = render(
      <Provider store={store}>
        <FiatOnTestnetsFriction />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
