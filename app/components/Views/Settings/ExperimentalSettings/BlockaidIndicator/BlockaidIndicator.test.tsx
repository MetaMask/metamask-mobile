import React from 'react';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import { View } from 'react-native-animatable';
import { PPOMInitialisationStatus } from '@metamask/ppom-validator';
import { render } from '@testing-library/react-native';

import initialBackgroundState from '../../../../../util/test/initial-background-state.json';
import { mockTheme, ThemeContext } from '../../../../../util/theme';
import BlockaidIndicator from '.';

const mockStore = configureMockStore();

const initialState = {
  experimentalSettings: {
    securityAlertsEnabled: true,
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

jest.mock('../../../../../core/Engine', () => ({
  context: {
    PreferencesController: {
      state: {
        securityAlertsEnabled: true,
      },
      setSecurityAlertsEnabled: () => undefined,
    },
  },
}));

const MockView = View;

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () =>
    ({ children }: any) =>
      <MockView>{children}</MockView>,
);

const store = mockStore(initialState);

describe('BlockaidIndicator', () => {
  it('should render correctly', () => {
    const wrapper = render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <BlockaidIndicator navigation={{}} route={{}} />,
        </ThemeContext.Provider>
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should render correctly if PPOM initialisation failed', () => {
    const wrapper = render(
      <Provider
        store={mockStore({
          ...initialState,
          experimentalSettings: {
            ...initialState.experimentalSettings,
            ppomInitialisationStatus: PPOMInitialisationStatus.FAIL,
          },
        })}
      >
        <ThemeContext.Provider value={mockTheme}>
          <BlockaidIndicator navigation={{}} route={{}} />,
        </ThemeContext.Provider>
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
    expect(wrapper.getByText('Something went wrong')).toBeTruthy();
  });
});
