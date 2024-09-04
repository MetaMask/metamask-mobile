import React from 'react';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';

import { render } from '@testing-library/react-native';

import { backgroundState } from '../../../../util/test/initial-root-state';
import { mockTheme, ThemeContext } from '../../../../util/theme';
import ExperimentalSettings from './';
import mockedEngine from '../../../../core/__mocks__/MockedEngine';

const mockStore = configureMockStore();

const initialState = {
  experimentalSettings: {
    securityAlertsEnabled: true,
  },
  engine: {
    backgroundState,
  },
};

const store = mockStore(initialState);

const setOptions = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  init: () => mockedEngine.init(),
}));

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
});
