import React from 'react';
import { shallow } from 'enzyme';
import GeneralSettings from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { AppThemeKey } from '../../../../util/theme/models';

const mockStore = configureMockStore();
const initialState = {
  privacy: { approvedHosts: [] },
  browser: { history: [] },
  settings: {
    lockTime: 1000,
    searchEngine: 'DuckDuckGo',
    useBlockieIcon: true,
  },
  engine: {
    backgroundState: {
      CurrencyRateController: { currentCurrency: 'USD' },
      NetworkController: {
        provider: {
          type: 'mainnet',
        },
      },
      PreferencesController: { selectedAddress: '0x0' },
    },
  },
  user: { appTheme: AppThemeKey.light },
};
const store = mockStore(initialState);

describe('GeneralSettings', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <GeneralSettings />
      </Provider>,
    );
    expect(wrapper.dive()).toMatchSnapshot();
  });
});
