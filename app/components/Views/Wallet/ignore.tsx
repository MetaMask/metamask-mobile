/* import React from 'react';
import { measureRenders } from 'reassure';
import Wallet from './'; // Adjust the import path if necessary
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import { mockInitialState } from './index.test';
import { createMockAccountsControllerState } from '../../../util/test/accountsControllerTestUtils';

import Engine from '../../../core/Engine';
const mockEngine = Engine;
const MOCK_ADDRESS = '0xc4955c0d639d99699bfd7ec54d9fafee40e4d272';

const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerState([
  MOCK_ADDRESS,
]);
jest.mock('../../../core/Engine', () => ({
  init: () => mockEngine.init({}),
  getTotalFiatAccountBalance: jest.fn(),
  context: {
    PreferencesController: {
      selectedAddress: MOCK_ADDRESS,
      identities: {
        [MOCK_ADDRESS]: {
          name: 'Account 1',
          address: MOCK_ADDRESS,
        },
      },
    },
    NftController: {
      allNfts: {
        [MOCK_ADDRESS]: {
          [MOCK_ADDRESS]: [],
        },
      },
      allNftContracts: {
        [MOCK_ADDRESS]: {
          [MOCK_ADDRESS]: [],
        },
      },
    },
    TokenRatesController: {
      poll: jest.fn(),
    },
    TokenDetectionController: {
      detectTokens: jest.fn(),
    },
    NftDetectionController: {
      detectNfts: jest.fn(),
    },
    AccountTrackerController: {
      refresh: jest.fn(),
    },
    KeyringController: {
      state: {
        keyrings: [
          {
            accounts: ['0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272'],
          },
        ],
      },
    },
    AccountsController: {
      ...MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest
    .fn()
    .mockImplementation((callback) => callback(mockInitialState)),
}));

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

jest.mock('react-native-scrollable-tab-view', () => {
  const ScrollableTabViewMock = jest
    .fn()
    .mockImplementation(() => ScrollableTabViewMock);
  // TODO - Clean up mock.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  ScrollableTabViewMock.defaultProps = {
    onChangeTab: jest.fn(),
    renderTabBar: jest.fn(),
  };
  return ScrollableTabViewMock;
});

// Mock store setup
const mockStore = configureMockStore();
const store = mockStore(mockInitialState);

test('Simple test', async () => {
  const test = await measureRenders(
    <Provider store={store}>
      <Wallet />
    </Provider>,
  );
  console.log('ENTER test', test);
});
 */
