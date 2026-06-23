import {
  TransactionStatus,
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { createStateFixture } from '../stateFixture';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';

export const ACTIVITY_CV_ACCOUNT = '0x0000000000000000000000000000000000000001';

const ACTIVITY_CV_RECIPIENT = '0x80181d3ba89220cdb80234fc7aa19d5cc56229cc';

export const buildConfirmedLocalSendTransaction = (): TransactionMeta =>
  ({
    id: 'activity-cv-confirmed-send',
    hash: '0xactivitycvconfirmedsend',
    chainId: '0x1',
    status: TransactionStatus.confirmed,
    time: 1_716_367_781_000,
    type: TransactionType.simpleSend,
    txParams: {
      from: ACTIVITY_CV_ACCOUNT,
      to: ACTIVITY_CV_RECIPIENT,
      value: '0xde0b6b3a7640000',
      nonce: '0x0',
    },
    txReceipt: { status: '0x1' },
  }) as unknown as TransactionMeta;

export const buildPendingLocalSendTransaction = (): TransactionMeta =>
  ({
    id: 'activity-cv-pending-send',
    hash: '0xactivitycvpendingsend',
    chainId: '0x1',
    status: TransactionStatus.submitted,
    time: 1_716_367_782_000,
    type: TransactionType.simpleSend,
    txParams: {
      from: ACTIVITY_CV_ACCOUNT,
      to: ACTIVITY_CV_RECIPIENT,
      value: '0xde0b6b3a7640000',
      nonce: '0x1',
    },
  }) as unknown as TransactionMeta;

const enabledMainnetNetworkMap = {
  eip155: {
    '0x1': true,
  },
  solana: {},
} as const;

/**
 * Minimal Activity state. EVM networks are intentionally disabled by default so
 * ActivityList renders through Redux without kicking off the external tx API.
 */
export const initialStateActivity = () =>
  createStateFixture()
    .withMinimalAccounts(ACTIVITY_CV_ACCOUNT)
    .withMinimalMainnetNetwork()
    .withMinimalMultichainNetwork(true)
    .withMinimalTransactionController()
    .withMinimalKeyringController()
    .withMinimalBridgeController()
    .withMinimalTokenRates()
    .withMinimalMultichainTransactions()
    .withAccountTreeForSelectedAccount()
    .withRemoteFeatureFlags({})
    .withOverrides({
      settings: {
        showFiatOnTestnets: true,
      },
      engine: {
        backgroundState: {
          AccountTrackerController: {
            accounts: {},
            accountsByChainId: {},
          },
          CurrencyRateController: {
            currentCurrency: 'USD',
            currencyRates: {
              ETH: {
                conversionRate: 2500,
                usdConversionRate: 2500,
              },
            },
          },
          GasFeeController: {
            gasFeeEstimates: {},
          },
          MoneyAccountController: {
            moneyAccounts: {},
          },
          NetworkEnablementController: {
            enabledNetworkMap: {
              eip155: {},
              solana: {},
            },
          },
          PreferencesController: {
            showTestNetworks: false,
            tokenNetworkFilter: {},
          },
          SmartTransactionsController: {
            smartTransactionsState: {
              smartTransactions: {},
            },
          },
          TokenBalancesController: {
            tokenBalances: {},
          },
          TokensController: {
            allTokens: {
              '0x1': {
                [ACTIVITY_CV_ACCOUNT]: [],
              },
            },
            allDetectedTokens: {},
            allIgnoredTokens: {},
          },
        },
      },
    } as unknown as DeepPartial<RootState>);

export const activityLineaNetworkOverride = {
  engine: {
    backgroundState: {
      NetworkController: {
        networkConfigurationsByChainId: {
          '0xe708': {
            chainId: '0xe708',
            rpcEndpoints: [
              {
                networkClientId: 'linea-mainnet',
                url: 'https://linea-mainnet.infura.io/v3/{infuraProjectId}',
                type: 'infura',
                name: 'Linea default RPC',
              },
            ],
            defaultRpcEndpointIndex: 0,
            blockExplorerUrls: ['https://lineascan.build'],
            defaultBlockExplorerUrlIndex: 0,
            name: 'Linea',
            nativeCurrency: 'ETH',
          },
        },
      },
    },
  },
} as unknown as DeepPartial<RootState>;

export const initialStateActivityWithLocalTransactions = (
  transactions: TransactionMeta[],
) =>
  initialStateActivity().withOverrides({
    engine: {
      backgroundState: {
        NetworkEnablementController: {
          enabledNetworkMap: enabledMainnetNetworkMap,
        },
        TransactionController: {
          transactions,
          swapsTransactions: {},
        },
      },
    },
  } as unknown as DeepPartial<RootState>);

export const initialStateActivityWithRedesignEnabled = () =>
  initialStateActivity().withRemoteFeatureFlags({
    tmcuActivityRedesignEnabled: true,
  });
