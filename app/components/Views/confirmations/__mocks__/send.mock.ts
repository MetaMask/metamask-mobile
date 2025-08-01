import { Hex } from '@metamask/utils';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { InternalAccount } from '@metamask/keyring-internal-api';

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
              address: '0x12345' as Hex,
              metadata: {},
            },
          },
        },
      },
      TokenBalancesController: {
        tokenBalances: {
          ['0x12345' as Hex]: {
            ['0x1' as Hex]: {
              ['0x123' as Hex]: '0x5' as Hex,
            },
          },
        },
      },
      AccountTrackerController: {
        accountsByChainId: {
          ['0x1' as Hex]: {
            ['0x12345' as Hex]: {
              balance: '0xDE0B6B3A7640000',
            },
          },
        },
      },
      TokenRatesController: {
        marketData: {
          ['0x1' as Hex]: {
            ['0x123' as Hex]: {
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
