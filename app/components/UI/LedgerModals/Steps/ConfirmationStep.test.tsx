import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import ConfirmationStep from './ConfirmationStep';
import { ThemeContext, mockTheme } from '../../../../util/theme';

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
      <ThemeContext.Provider value={mockTheme}>
        <ConfirmationStep onReject={onRejectMock} />
      </ThemeContext.Provider>
    </Provider>,
  );
}

describe('ConfirmationStep', () => {
  it('renders correctly', () => {
    const component = createWrapper();
    expect(component).toMatchSnapshot();
  });
});
