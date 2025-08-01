import { Hex } from '@metamask/utils';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { InternalAccount } from '@metamask/keyring-internal-api';

export const ACCOUNT_ADDRESS_MOCK_1 = '0x12345' as Hex;
export const TOKEN_ADDRESS_MOCK_1 = '0x123' as Hex;

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
};
