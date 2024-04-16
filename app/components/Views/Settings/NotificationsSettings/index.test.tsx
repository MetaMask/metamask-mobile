import React from 'react';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

import { render } from '@testing-library/react-native';

import initialBackgroundState from '../../../../util/test/initial-background-state.json';
import { mockTheme, ThemeContext } from '../../../../util/theme';
import NotificationsSettings from '.';

const mockStore = configureMockStore();

const initialState = {
  notificationsSettings: {
    isEnabled: true,
  },
  engine: {
    backgroundState: initialBackgroundState,
  },
};

const store = mockStore(initialState);

const setOptions = jest.fn();

describe('NotificationsSettings', () => {
  it('should render correctly', () => {
    const wrapper = render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <NotificationsSettings
            navigation={{
              setOptions,
            }}
            route={{}}
          />
          ,
        </ThemeContext.Provider>
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
