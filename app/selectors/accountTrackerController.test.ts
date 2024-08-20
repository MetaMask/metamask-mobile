import {
  MOCK_ACCOUNTS_CONTROLLER_STATE,
  MOCK_ADDRESS_2,
} from '../util/test/accountsControllerTestUtils';
import { RootState } from '../reducers';
import { selectAccountBalanceByChainId } from './accountTrackerController';

const MOCK_CHAIN_ID = '0x1';

// jest.mock('../core/Engine.ts', () => ({
//   context: {
//     NetworkController: {
//       getNetworkClientById: () => ({
//         configuration: {
//           rpcUrl: 'https://mainnet.infura.io/v3',
//           chainId: '0x1',
//           ticker: 'ETH',
//           nickname: 'Ethereum mainnet',
//           rpcPrefs: {
//             blockExplorerUrl: 'https://etherscan.com',
//           },
//         },
//       }),
//       state: {
//         networkConfigurations: {
//           '673a4523-3c49-47cd-8d48-68dfc8a47a9c': {
//             id: '673a4523-3c49-47cd-8d48-68dfc8a47a9c',
//             rpcUrl: 'https://mainnet.infura.io/v3',
//             chainId: '0x1',
//             ticker: 'ETH',
//             nickname: 'Ethereum mainnet',
//             rpcPrefs: {
//               blockExplorerUrl: 'https://etherscan.com',
//             },
//           },
//         },
//         selectedNetworkClientId: '673a4523-3c49-47cd-8d48-68dfc8a47a9c',
//         networkMetadata: {},
//       },
//     },
//   },
// }));

describe('selectAccountBalanceByChainId', () => {
  it('returns account balance for chain id', () => {
    const result = selectAccountBalanceByChainId({
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: '673a4523-3c49-47cd-8d48-68dfc8a47a9c',
            networksMetadata: {},
            networkConfigurations: {
              '673a4523-3c49-47cd-8d48-68dfc8a47a9c': {
                id: '673a4523-3c49-47cd-8d48-68dfc8a47a9c',
                rpcUrl: 'https://bsc-dataseed1.binance.org/',
                chainId: MOCK_CHAIN_ID,
                ticker: 'ETH',
                nickname: 'Ethereum chain',
                rpcPrefs: {
                  blockExplorerUrl: 'https://etherscan.com',
                },
              },
            },
            // TODO: Replace "any" with type
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
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
    } as RootState);
    expect(result?.balance).toBe('0x1');
  });
  it('returns undefined when chain ID is undefined', () => {
    const result = selectAccountBalanceByChainId({
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: '673a4523-3c49-47cd-8d48-68dfc8a47a9c',
            networksMetadata: {},
            networkConfigurations: {},
            // TODO: Replace "any" with type
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
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
    } as RootState);
    expect(result).toBeUndefined();
  });
});
