import React from 'react';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { render } from '@testing-library/react-native';
import initialBackgroundState from '../../../../../../util/test/initial-background-state.json';

import { ThemeContext, mockTheme } from '../../../../../../util/theme';

import Root from '.';
import { ApprovalTypes } from '../../../../../../core/RPCMethods/RPCMethodMiddleware';
import { shallow } from 'enzyme';

jest.mock('react-native-keyboard-aware-scroll-view', () => {
  const KeyboardAwareScrollView = jest.requireActual('react-native').ScrollView;
  return { KeyboardAwareScrollView };
});

jest.mock('../../../../../../core/Engine', () => ({
  init: () => ({}),
  context: {
    KeyringController: {
      getAccountKeyringType: jest.fn(() => Promise.resolve({ data: {} })),
      getQRKeyringState: jest.fn(() =>
        Promise.resolve({ subscribe: jest.fn(), unsubscribe: jest.fn() }),
      ),
      state: {
        keyrings: [],
      },
    },
    SignatureController: {
      hub: {
        on: jest.fn(),
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

const messageParamsMock = {
  data: '0x4578616d706c652060706572736f6e616c5f7369676e60206d657373616765',
  from: '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477',
  meta: {
    url: 'https://metamask.github.io/test-dapp/',
    title: 'E2E Test Dapp',
    icon: 'https://metamask.github.io/test-dapp/metamask-fox.svg',
    analytics: {
      request_source: 'In-App-Browser',
      request_platform: 'Test-Platform',
    },
  },
  origin: 'metamask.github.io',
  metamaskId: '85b76fd0-d1e9-11ed-a2fd-8ff017956a45',
};

const mockStore = configureMockStore();
const initialState = {
  modals: {
    signMessageModalVisible: false,
  },
  settings: {},
  signatureRequest: {},
  engine: {
    backgroundState: {
      ...initialBackgroundState,
      AccountTrackerController: {
        accounts: {
          '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272': {
            balance: 200,
          },
        },
      },
      PreferencesController: {
        selectedAddress: '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272',
        identities: {
          '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272': {
            address: '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272',
            name: 'Account 1',
          },
        },
      },
      CurrencyRateController: {
        currentCurrency: 'usd',
        currencyRates: {
          ETH: {
            conversionRate: 10,
          },
        },
      },
      NetworkController: {
        providerConfig: {
          chainId: '0x1',
        },
      },
    },
  },
};
const store = mockStore(initialState);

describe('Root', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <Root
            messageParams={undefined}
            approvalType={undefined}
            onSignConfirm={() => undefined}
            onSignReject={() => undefined}
          />
        </ThemeContext.Provider>
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should match snapshot', async () => {
    const container = render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <Root
            messageParams={messageParamsMock}
            approvalType={ApprovalTypes.PERSONAL_SIGN}
            onSignConfirm={() => undefined}
            onSignReject={() => undefined}
          />
        </ThemeContext.Provider>
      </Provider>,
    );
    expect(container).toMatchSnapshot();
  });
});
