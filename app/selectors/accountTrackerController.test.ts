import { RpcEndpointType } from '@metamask/network-controller';
import { SolScope } from '@metamask/keyring-api';
import { AccountInformation } from '@metamask/assets-controllers';
import {
  MOCK_ACCOUNTS_CONTROLLER_STATE,
  MOCK_ADDRESS_2,
} from '../util/test/accountsControllerTestUtils';
import { RootState } from '../reducers';
import {
  selectAccountBalanceByChainId,
  selectAccountsByContextualChainId,
} from './accountTrackerController';
import { mockNetworkState } from '../util/test/network';
import mockedEngine from '../core/__mocks__/MockedEngine';

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

describe('selectAccountsByContextualChainId', () => {
  const mockAccountsByChainId = {
    '0x1': {
      [MOCK_ADDRESS_2]: { balance: '0x100' },
      '0xAccount2': { balance: '0x200' },
    },
    '0x5': {
      [MOCK_ADDRESS_2]: { balance: '0x300' },
      '0xAccount3': { balance: '0x400' },
    },
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns accounts for the contextual chain ID', () => {
    const result = selectAccountsByContextualChainId.resultFunc(
      mockAccountsByChainId,
      '0x5',
      '0x1',
    );

    expect(result).toEqual({
      [MOCK_ADDRESS_2]: { balance: '0x300' },
      '0xAccount3': { balance: '0x400' },
    });
  });

  it('returns an empty object if no accounts exist for the contextual chain ID', () => {
    const result = selectAccountsByContextualChainId.resultFunc(
      mockAccountsByChainId,
      '0xUnknownChain',
      '0x1',
    );

    expect(result).toEqual({});
  });

  it('returns an empty object if accountsByChainId is undefined', () => {
    const result = selectAccountsByContextualChainId.resultFunc(
      undefined as unknown as Record<
        string,
        { [address: string]: AccountInformation }
      >,
      '0x1',
      '0x1',
    );

    expect(result).toEqual({});
  });

  it('falls back to chainId when contextual chain ID is undefined', () => {
    const result = selectAccountsByContextualChainId.resultFunc(
      mockAccountsByChainId,
      undefined,
      '0x1',
    );

    expect(result).toEqual({
      [MOCK_ADDRESS_2]: { balance: '0x100' },
      '0xAccount2': { balance: '0x200' },
    });
  });
});
