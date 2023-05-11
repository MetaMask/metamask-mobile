import React from 'react';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { render } from '@testing-library/react-native';
import { shallow } from 'enzyme';

import { ThemeContext, mockTheme } from '../../../../util/theme';

import Root from '.';

jest.mock('../../../../util/address', () => ({
  ...jest.requireActual('../../../../util/address'),
  renderAccountName: jest.fn(),
}));

jest.mock('react-native-keyboard-aware-scroll-view', () => {
  const KeyboardAwareScrollView = jest.requireActual('react-native').ScrollView;
  return { KeyboardAwareScrollView };
});

jest.mock('../../../../core/Engine', () => ({
  init: () => ({}),
  context: {
    KeyringController: {
      getAccountKeyringType: jest.fn(() => Promise.resolve({ data: {} })),
      getQRKeyringState: jest.fn(() => Promise.resolve({ data: {} })),
    },
    SignatureController: {
      hub: {
        on: (eventName: any, fn: any) => {
          if (eventName === 'unapprovedPersonalMessage') {
            fn(
              JSON.parse(
                '{"data":"0x4578616d706c652060706572736f6e616c5f7369676e60206d657373616765","from":"0x935e73edb9ff52e23bac7f7e043a1ecd06d05477","meta":{"url":"https://metamask.github.io/test-dapp/","title":"E2E Test Dapp","icon":"https://api.faviconkit.com/metamask.github.io/50","analytics":{"request_source":"In-App-Browser"}},"origin":"metamask.github.io","metamaskId":"85b76fd0-d1e9-11ed-a2fd-8ff017956a45"}',
              ),
            );
          }
        },
      },
    },
  },
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigation: {},
  }),
  createNavigatorFactory: () => ({}),
}));

const mockStore = configureMockStore();
const initialState = {
  settings: {},
  engine: {
    backgroundState: {
      AccountTrackerController: {
        accounts: {
          '0x0': {
            balance: 200,
          },
          '0x1': {
            balance: 200,
          },
        },
      },
      PreferencesController: {
        selectedAddress: '0x0',
        identities: {
          '0x0': {
            address: '0x0',
            name: 'Account 1',
          },
          '0x1': {
            address: '0x1',
            name: 'Account 2',
          },
        },
      },
      CurrencyRateController: {
        conversionRate: 10,
        currentCurrency: 'usd',
      },
    },
  },
};
const store = mockStore(initialState);

describe('Root', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<Root />);
    expect(wrapper).toMatchSnapshot();
  });

  it('should match snapshot', async () => {
    const container = render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <Root />
        </ThemeContext.Provider>
      </Provider>,
    );
    expect(container).toMatchSnapshot();
  });
});
