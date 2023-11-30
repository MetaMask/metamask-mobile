import { shallow } from 'enzyme';
import React from 'react';
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
  return shallow(
    <Provider store={store}>
      <ConfirmationStep onReject={onRejectMock} />
    </Provider>,
  ).find(ConfirmationStep);
}

describe('ConfirmationStep', () => {
  it('renders correctly', () => {
    const wrapper = createWrapper();
    expect(wrapper).toMatchSnapshot();
  });
});
