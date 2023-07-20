import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { ThemeContext, mockTheme } from '../../../../util/theme';
import configureMockStore from 'redux-mock-store';
import initialBackgroundState from '../../../../util/test/initial-background-state.json';
import ExperimentalSettings from '.';
import SECURITY_ALERTS_TOGGLE_TEST_ID from './constants';

const mockStore = configureMockStore();

const initialState = {
  experimentalSettings: {
    securityAlertsEnabled: false,
  },
  engine: {
    backgroundState: initialBackgroundState,
  },
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigation: {},
  }),
  createNavigatorFactory: () => ({}),
}));

const store = mockStore(initialState);

const setOptions = jest.fn();

describe('ExperimentalSettings', () => {
  it('should render correctly', () => {
    const wrapper = render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <ExperimentalSettings
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

  it('should render blockaid togggle button', async () => {
    const wrapper = render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <ExperimentalSettings
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
    expect(await wrapper.findByText('Security alerts')).toBeDefined();
    expect(await wrapper.findByText('Blockaid')).toBeDefined();

    const toggle = wrapper.getByTestId(SECURITY_ALERTS_TOGGLE_TEST_ID);
    expect(toggle).toBeDefined();
    expect(toggle.props.value).toBe(false);
  });
});
