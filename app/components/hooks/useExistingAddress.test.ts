import {
  DeepPartial,
  renderHookWithProvider,
} from '../../util/test/renderWithProvider';
import useExistingAddress from './useExistingAddress';
import { backgroundState } from '../../util/test/initial-root-state';
import { createMockAccountsControllerState } from '../../util/test/accountsControllerTestUtils';
import { RootState } from '../../reducers';

const MOCK_ADDRESS_1 = '0x0';
const MOCK_ADDRESS_2 = '0x1';

const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerState([
  MOCK_ADDRESS_1,
  MOCK_ADDRESS_2,
]);

const mockInitialState: DeepPartial<RootState> = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      NetworkController: {
        selectedNetworkClientId: '673a4523-3c49-47cd-8d48-68dfc8a47a9c',
        networksMetadata: {},
        networkConfigurations: {
          '673a4523-3c49-47cd-8d48-68dfc8a47a9c': {
            id: '673a4523-3c49-47cd-8d48-68dfc8a47a9c',
            rpcUrl: 'http://localhost/v3/',
            chainId: '0x1',
            ticker: 'ETH',
            nickname: 'Ethereum chain',
            rpcPrefs: {
              blockExplorerUrl: 'https://etherscan.com',
            },
          },
        },
      },
      AddressBookController: {
        addressBook: {
          [MOCK_ADDRESS_2]: {
            [MOCK_ADDRESS_2]: {
              address: MOCK_ADDRESS_2,
              name: 'Account 2',
            },
          },
        },
      },
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useSelector: (fn: any) => fn(mockInitialState),
}));

jest.mock('../../core/Engine', () => ({
  context: {
    NetworkController: {
      getNetworkClientById: () => ({
        configuration: {
          rpcUrl: 'https://mainnet.infura.io/v3',
          chainId: '0x1',
          ticker: 'ETH',
          nickname: 'Ethereum mainnet',
          rpcPrefs: {
            blockExplorerUrl: 'https://etherscan.com',
          },
        },
      }),
      state: {
        networkConfigurations: {
          '673a4523-3c49-47cd-8d48-68dfc8a47a9c': {
            id: '673a4523-3c49-47cd-8d48-68dfc8a47a9c',
            rpcUrl: 'https://mainnet.infura.io/v3',
            chainId: '0x1',
            ticker: 'ETH',
            nickname: 'Ethereum mainnet',
            rpcPrefs: {
              blockExplorerUrl: 'https://etherscan.com',
            },
          },
        },
        selectedNetworkClientId: '673a4523-3c49-47cd-8d48-68dfc8a47a9c',
        networkMetadata: {},
      },
    },
  },
}));

describe('useExistingAddress', () => {
  it('should return existing address from accounts controller', async () => {
    const { result } = renderHookWithProvider(
      () => useExistingAddress(MOCK_ADDRESS_1),
      {
        state: mockInitialState,
      },
    );
    expect(result?.current?.name).toEqual('Account 1');
  });
  it('should return existing address from address book', async () => {
    const { result } = renderHookWithProvider(
      () => useExistingAddress(MOCK_ADDRESS_2),
      {
        state: mockInitialState,
      },
    );
    expect(result?.current?.name).toEqual('Account 2');
  });
  it('should return undefined address not in identities or address book', async () => {
    const { result } = renderHookWithProvider(() => useExistingAddress('0x2'), {
      state: mockInitialState,
    });
    expect(result?.current).toBeUndefined();
  });
});
