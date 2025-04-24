import { RpcEndpointType } from '@metamask/network-controller';
import {
  MOCK_ACCOUNTS_CONTROLLER_STATE,
  MOCK_ADDRESS_2,
} from '../util/test/accountsControllerTestUtils';
import { RootState } from '../reducers';
import { selectAccountBalanceByChainId } from './accountTrackerController';
import { mockNetworkState } from '../util/test/network';
import mockedEngine from '../core/__mocks__/MockedEngine';
import { SolScope } from '@metamask/keyring-api';

const MOCK_CHAIN_ID = '0x1';

jest.mock('../core/Engine', () => ({
  init: () => mockedEngine.init(),
}));

describe('selectAccountBalanceByChainId', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns account balance for chain id', () => {
    const result = selectAccountBalanceByChainId({
      engine: {
        backgroundState: {
          NetworkController: {
            ...mockNetworkState({
              chainId: MOCK_CHAIN_ID,
              id: 'mainnet',
              nickname: 'Ethereum Mainnet',
              ticker: 'ETH',
            }),
          },
          AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
          AccountTrackerController: {
            accountsByChainId: {
              [MOCK_CHAIN_ID]: {
                [MOCK_ADDRESS_2]: { balance: '0x1' },
              },
            },
          },
          MultichainNetworkController: {
            isEvmSelected: true,
            selectedMultichainNetworkChainId: SolScope.Mainnet,
            multichainNetworkConfigurationsByChainId: {},
          },
        },
      },
    } as unknown as RootState);
    expect(result?.balance).toBe('0x1');
  });
  it('returns undefined when chain ID is undefined', () => {
    const result = selectAccountBalanceByChainId({
      engine: {
        backgroundState: {
          MultichainNetworkController: {
            isEvmSelected: true,
            selectedMultichainNetworkChainId: SolScope.Mainnet,

            multichainNetworkConfigurationsByChainId: {},
          },
          NetworkController: {
            ...mockNetworkState({
              id: 'sepolia',
              nickname: 'Sepolia',
              ticker: 'ETH',
              chainId: '0xaa36a7',
              type: RpcEndpointType.Infura,
            }),
          },
          AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
          AccountTrackerController: {
            accountsByChainId: {
              [MOCK_CHAIN_ID]: {
                [MOCK_ADDRESS_2]: { balance: '0x1' },
              },
            },
            // TODO: Replace "any" with type
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
        },
      },
    } as unknown as RootState);
    expect(result).toBeUndefined();
  });
});
