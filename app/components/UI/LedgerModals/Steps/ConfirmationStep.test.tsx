import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import ConfirmationStep from './ConfirmationStep';

const mockStore = configureMockStore();

const initialState = {
  user: {
    AppTheme: 'light',
  },
};

const store = mockStore(initialState);

function createWrapper({ onRejectMock = jest.fn() } = {}) {
  return render(
    <Provider store={store}>
      <ConfirmationStep onReject={onRejectMock} />
    </Provider>,
  );
}

describe('ConfirmationStep', () => {
  it('renders correctly', () => {
    const { toJSON } = createWrapper();
    expect(toJSON()).toMatchSnapshot();
  });
});
