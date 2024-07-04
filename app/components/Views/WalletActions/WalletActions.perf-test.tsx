import React from 'react';
import { measureRenders } from 'reassure';
import WalletActions from './WalletActions';
import { fireEvent, screen } from '@testing-library/react-native';
import { WalletActionsModalSelectorsIDs } from '../../../../e2e/selectors/Modals/WalletActionsModal.selectors';
import { createMockAccountsControllerState } from '../../../util/test/accountsControllerTestUtils';
import initialBackgroundState from '../../../util/test/initial-background-state.json';
jest.setTimeout(600_000);
const MOCK_ADDRESS = '0xc4955c0d639d99699bfd7ec54d9fafee40e4d272';

const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerState([
  MOCK_ADDRESS,
]);
const mockInitialState = {
  fiatOrders: {
    networks: [],
  },
  browser: {
    tabs: [],
  },
  navigation: {
    currentRoute: 'WalletView',
    currentBottomNavRoute: 'Wallet',
  },
  legalNotices: {
    newPrivacyPolicyToastShownDate: null,
    newPrivacyPolicyToastClickedOrClosed: false,
  },
  networkOnboarded: {
    networkOnboardedState: {
      '0x1': true,
    },
  },
  security: {
    dataCollectionForMarketing: true,
  },
  swaps: {
    [MOCK_ADDRESS]: { isLive: true },
    hasOnboarded: false,
    isLive: true,
  },
  wizard: {
    step: 0,
  },
  settings: {
    primaryCurrency: 'usd',
  },
  engine: {
    backgroundState: {
      ...initialBackgroundState,
      PreferencesController: {
        selectedAddress: MOCK_ADDRESS,
        identities: {
          [MOCK_ADDRESS]: {
            name: 'Account 1',
            address: MOCK_ADDRESS,
          },
        },
      },
      AccountsController: {
        ...MOCK_ACCOUNTS_CONTROLLER_STATE,
      },
    },
  },
};

jest.mock('react-native-safe-area-context', () => {
  // using disting digits for mock rects to make sure they are not mixed up
  const inset = { top: 1, right: 2, bottom: 3, left: 4 };
  const frame = { width: 5, height: 6, x: 7, y: 8 };
  return {
    SafeAreaProvider: jest.fn().mockImplementation(({ children }) => children),
    SafeAreaConsumer: jest
      .fn()
      .mockImplementation(({ children }) => children(inset)),
    useSafeAreaInsets: jest.fn().mockImplementation(() => inset),
    useSafeAreaFrame: jest.fn().mockImplementation(() => frame),
  };
});
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      setOptions: jest.fn(),
      goBack: jest.fn(),
      reset: jest.fn(),
      dangerouslyGetParent: () => ({
        pop: jest.fn(),
      }),
    }),
  };
});

const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: jest.fn().mockImplementation(() => mockDispatch),
  useSelector: jest
    .fn()
    .mockImplementation((callback) => callback(mockInitialState)),
}));

test('RN CLI - WalletActions 10 runs', async () => {
  const scenario = async () => {
    const button = screen.getByTestId(
      WalletActionsModalSelectorsIDs.SEND_BUTTON,
    );

    /*   fireEvent.press(button);

    await screen.findByText('Cancel'); */
  };

  await measureRenders(<WalletActions /> /* , { scenario, runs: 1 } */);
});

/* test('RN CLI - WalletActions 50 runs', async () => {
  const scenario = async () => {
    const button = screen.getByTestId(
      WalletActionsModalSelectorsIDs.SEND_BUTTON,
    );

    /*    fireEvent.press(button);

    await screen.findByText('Cancel');
  };

  await measureRenders(<WalletActions />, { scenario, runs: 50 });
}); */
