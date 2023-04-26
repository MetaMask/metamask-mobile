import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import GlobalAlert from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

const mockStore = configureMockStore();
const initialState = {
  alert: { isVisible: true, autodismiss: 300, children: <Text>{'Lol'}</Text> },
};
const store = mockStore(initialState);

describe('GlobalAlert', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <GlobalAlert />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
