import { Hex } from '@metamask/utils';
import { InternalAccount } from '@metamask/keyring-internal-api';

import { ProviderValues } from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';

export const ACCOUNT_ADDRESS_MOCK_1 =
  '0xeDd1935e28b253C7905Cf5a944f0B5830FFA916a' as Hex;
export const TOKEN_ADDRESS_MOCK_1 =
  '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477' as Hex;
export const ACCOUNT_ADDRESS_MOCK_2 =
  '14grJpemFaf88c8tiVb77W7TYg2W3ir6pfkKz3YjhhZ5';

export const SOLANA_ASSET = {
  address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
  aggregators: [],
  balance: '400',
  balanceFiat: '1500',
  chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  decimals: 18,
  hasBalanceError: false,
  image: '',
  isETH: undefined,
  isNative: true,
  logo: 'https://upload.wikimedia.org/wikipedia/commons/0/05/Ethereum_logo_2014.svg',
  name: 'Ethereum',
  symbol: 'ETH',
};

export const evmSendStateMock = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: {
        internalAccounts: {
          selectedAccount: 'evm-account-id',
          accounts: {
            'evm-account-id': {
              id: 'evm-account-id',
              type: 'eip155:eoa' as InternalAccount['type'],
              address: ACCOUNT_ADDRESS_MOCK_1,
              metadata: {},
            },
            'solana-account-id': {
              id: 'solana-account-id',
              address: ACCOUNT_ADDRESS_MOCK_2,
              metadata: {},
            },
          },
        },
      },
      TokenBalancesController: {
        tokenBalances: {
          [ACCOUNT_ADDRESS_MOCK_1]: {
            ['0x1' as Hex]: {
              [TOKEN_ADDRESS_MOCK_1]: '0x5' as Hex,
            },
          },
        },
      },
      AccountTrackerController: {
        accountsByChainId: {
          ['0x1' as Hex]: {
            [ACCOUNT_ADDRESS_MOCK_1]: {
              balance: '0xDE0B6B3A7640000',
            },
          },
        },
      },
      TokenRatesController: {
        marketData: {
          ['0x1' as Hex]: {
            [TOKEN_ADDRESS_MOCK_1]: {
              price: 3890,
            },
          },
        },
      },
      CurrencyRateController: {
        currentCurrency: 'usd',
        currencyRates: {
          ETH: {
            conversionRate: 1,
          },
        },
      },
    },
  },
} as ProviderValues['state'];

export const solanaSendStateMock = {
  engine: {
    backgroundState: {
      ...evmSendStateMock?.engine?.backgroundState,
      AccountsController: {
        internalAccounts: {
          ...evmSendStateMock?.engine?.backgroundState?.AccountsController
            ?.internalAccounts,
          selectedAccount: 'solana-account-id',
        },
      },
    },
  },
} as ProviderValues['state'];
