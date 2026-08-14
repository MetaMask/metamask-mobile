import {
  TransactionStatus,
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { createStateFixture } from '../stateFixture';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import type { PredictActivity } from '../../../app/components/UI/Predict/types';

export const ACTIVITY_CV_ACCOUNT = '0x0000000000000000000000000000000000000001';

export const ACTIVITY_CV_RECIPIENT =
  '0x80181d3ba89220cdb80234fc7aa19d5cc56229cc';

/** Mainnet USDC — used for ERC-20 send/receive Activity CV fixtures. */
export const ACTIVITY_CV_USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

/** Hashes for Activity Mainnet↔Linea network-filter CV (Core UX Test 1). */
export const MAINNET_ACTIVITY_HASH = '0xactivitycvmainnettx';
export const LINEA_ACTIVITY_HASH = '0xactivitycvlineatx';

interface LocalSendOverrides {
  id?: string;
  hash?: string;
  chainId?: string;
  time?: number;
}

export const buildConfirmedLocalSendTransaction = (
  overrides: LocalSendOverrides = {},
): TransactionMeta =>
  ({
    id: overrides.id ?? 'activity-cv-confirmed-send',
    hash: overrides.hash ?? '0xactivitycvconfirmedsend',
    chainId: overrides.chainId ?? '0x1',
    status: TransactionStatus.confirmed,
    time: overrides.time ?? 1_716_367_781_000,
    type: TransactionType.simpleSend,
    txParams: {
      from: ACTIVITY_CV_ACCOUNT,
      to: ACTIVITY_CV_RECIPIENT,
      value: '0xde0b6b3a7640000',
      nonce: '0x0',
    },
    txReceipt: { status: '0x1' },
  }) as unknown as TransactionMeta;

/** Confirmed ERC-20 USDC send (1 USDC) for ActivityScreen transaction-row CV. */
export const buildConfirmedLocalUsdcSendTransaction = (): TransactionMeta =>
  ({
    id: 'activity-cv-confirmed-usdc-send',
    hash: '0xactivitycvconfirmedusdcsend',
    chainId: '0x1',
    status: TransactionStatus.confirmed,
    time: 1_716_367_783_000,
    type: TransactionType.tokenMethodTransfer,
    transferInformation: {
      amount: '1000000',
      contractAddress: ACTIVITY_CV_USDC,
      decimals: 6,
      symbol: 'USDC',
    },
    txParams: {
      from: ACTIVITY_CV_ACCOUNT,
      to: ACTIVITY_CV_USDC,
      value: '0x0',
      nonce: '0x2',
      data: `0xa9059cbb000000000000000000000000${ACTIVITY_CV_RECIPIENT.slice(
        2,
      ).toLowerCase()}00000000000000000000000000000000000000000000000000000000000f4240`,
    },
    txReceipt: { status: '0x1' },
  }) as unknown as TransactionMeta;

const buildApproveCalldata = (spender: string, amount: bigint): string =>
  `0x095ea7b3${spender.slice(2).toLowerCase().padStart(64, '0')}${amount
    .toString(16)
    .padStart(64, '0')}`;

/** ERC-20 `increaseAllowance(spender, amount)` — selector `0x39509351`. */
const buildIncreaseAllowanceCalldata = (
  spender: string,
  amount: bigint,
): string =>
  `0x39509351${spender.slice(2).toLowerCase().padStart(64, '0')}${amount
    .toString(16)
    .padStart(64, '0')}`;

/** Confirmed USDC approve (100 USDC) for ActivityScreen transaction-row CV. */
export const buildConfirmedLocalUsdcApproveTransaction = (): TransactionMeta =>
  ({
    id: 'activity-cv-confirmed-usdc-approve',
    hash: '0xactivitycvconfirmedusdcapprove',
    chainId: '0x1',
    status: TransactionStatus.confirmed,
    time: 1_716_367_785_000,
    type: TransactionType.tokenMethodApprove,
    transferInformation: {
      contractAddress: ACTIVITY_CV_USDC,
      decimals: 6,
      symbol: 'USDC',
    },
    txParams: {
      from: ACTIVITY_CV_ACCOUNT,
      to: ACTIVITY_CV_USDC,
      value: '0x0',
      nonce: '0x4',
      data: buildApproveCalldata(ACTIVITY_CV_RECIPIENT, 100_000_000n),
    },
    txReceipt: { status: '0x1' },
  }) as unknown as TransactionMeta;

/** Confirmed USDC increaseAllowance (100 USDC) for ActivityScreen CV. */
export const buildConfirmedLocalUsdcIncreaseAllowanceTransaction =
  (): TransactionMeta =>
    ({
      id: 'activity-cv-confirmed-usdc-increase-allowance',
      hash: '0xactivitycvconfirmedusdcincrease',
      chainId: '0x1',
      status: TransactionStatus.confirmed,
      time: 1_716_367_786_000,
      type: TransactionType.tokenMethodIncreaseAllowance,
      transferInformation: {
        contractAddress: ACTIVITY_CV_USDC,
        decimals: 6,
        symbol: 'USDC',
      },
      txParams: {
        from: ACTIVITY_CV_ACCOUNT,
        to: ACTIVITY_CV_USDC,
        value: '0x0',
        nonce: '0x5',
        data: buildIncreaseAllowanceCalldata(
          ACTIVITY_CV_RECIPIENT,
          100_000_000n,
        ),
      },
      txReceipt: { status: '0x1' },
    }) as unknown as TransactionMeta;

const MAX_UINT256 = 2n ** 256n - 1n;

/** Confirmed unlimited USDC approve for ActivityScreen transaction-row CV. */
export const buildConfirmedLocalUsdcUnlimitedApproveTransaction =
  (): TransactionMeta =>
    ({
      id: 'activity-cv-confirmed-usdc-unlimited-approve',
      hash: '0xactivitycvconfirmedusdcunlimited',
      chainId: '0x1',
      status: TransactionStatus.confirmed,
      time: 1_716_367_787_000,
      type: TransactionType.tokenMethodApprove,
      transferInformation: {
        contractAddress: ACTIVITY_CV_USDC,
        decimals: 6,
        symbol: 'USDC',
      },
      txParams: {
        from: ACTIVITY_CV_ACCOUNT,
        to: ACTIVITY_CV_USDC,
        value: '0x0',
        nonce: '0x6',
        data: buildApproveCalldata(ACTIVITY_CV_RECIPIENT, MAX_UINT256),
      },
      txReceipt: { status: '0x1' },
    }) as unknown as TransactionMeta;

/** Confirmed USDC revoke (`approve(spender, 0)`) for ActivityScreen CV. */
export const buildConfirmedLocalUsdcRevokeTransaction = (): TransactionMeta =>
  ({
    id: 'activity-cv-confirmed-usdc-revoke',
    hash: '0xactivitycvconfirmedusdcrevoke',
    chainId: '0x1',
    status: TransactionStatus.confirmed,
    time: 1_716_367_788_000,
    type: TransactionType.tokenMethodApprove,
    transferInformation: {
      contractAddress: ACTIVITY_CV_USDC,
      decimals: 6,
      symbol: 'USDC',
    },
    txParams: {
      from: ACTIVITY_CV_ACCOUNT,
      to: ACTIVITY_CV_USDC,
      value: '0x0',
      nonce: '0x7',
      data: buildApproveCalldata(ACTIVITY_CV_RECIPIENT, 0n),
    },
    txReceipt: { status: '0x1' },
  }) as unknown as TransactionMeta;

/** Mainnet NFT collection used for ActivityScreen mint CV. */
export const ACTIVITY_CV_NFT_CONTRACT =
  '0x239fd4b0c4db49fa8660e65b97619d43d0e0a79d';

export const ACTIVITY_CV_NFT_COLLECTION_NAME = 'CryptoPunks';

/**
 * Confirmed zero-value contract interaction for ActivityScreen transaction-row CV.
 * Uses a non-wrap method id so it stays `contractInteraction` (no token amount).
 */
export const buildConfirmedLocalContractInteractionTransaction =
  (): TransactionMeta =>
    ({
      id: 'activity-cv-confirmed-contract-interaction',
      hash: '0xactivitycvconfirmedcontract',
      chainId: '0x1',
      status: TransactionStatus.confirmed,
      time: 1_716_367_786_000,
      type: TransactionType.contractInteraction,
      txParams: {
        from: ACTIVITY_CV_ACCOUNT,
        to: ACTIVITY_CV_RECIPIENT,
        value: '0x0',
        nonce: '0x5',
        data: '0xabcdef12',
      },
      txReceipt: { status: '0x1' },
    }) as unknown as TransactionMeta;

/** Confirmed cross-token bridge (ETH → USDC) for ActivityScreen transaction-row CV. */
export const buildConfirmedLocalBridgeTransaction = (): TransactionMeta =>
  ({
    id: 'activity-cv-confirmed-bridge',
    hash: '0xactivitycvconfirmedbridge',
    chainId: '0x1',
    status: TransactionStatus.confirmed,
    time: 1_716_367_784_000,
    type: TransactionType.bridge,
    txParams: {
      from: ACTIVITY_CV_ACCOUNT,
      to: ACTIVITY_CV_USDC,
      value: '0xde0b6b3a7640000',
      nonce: '0x3',
    },
    txReceipt: { status: '0x1' },
  }) as unknown as TransactionMeta;

/**
 * BridgeStatusController.txHistory for
 * {@link buildConfirmedLocalBridgeTransaction} (ETH → USDC, both amounts).
 */
export const activityCvBridgeHistoryEntry = {
  txMetaId: 'activity-cv-confirmed-bridge',
  account: ACTIVITY_CV_ACCOUNT,
  quote: {
    srcChainId: 1,
    destChainId: 59144,
    srcAsset: {
      symbol: 'ETH',
      decimals: 18,
      assetId: 'eip155:1/slip44:60',
    },
    destAsset: {
      symbol: 'USDC',
      decimals: 6,
      assetId: `eip155:59144/erc20:${ACTIVITY_CV_USDC.toLowerCase()}`,
    },
    srcTokenAmount: '1000000000000000000',
    destTokenAmount: '1000000',
  },
  status: {
    srcChain: {
      chainId: 1,
      txHash: '0xactivitycvconfirmedbridge',
    },
    destChain: {
      chainId: 59144,
      txHash: '0xactivitycvbridgedest',
    },
  },
  startTime: 1_716_367_784_000,
  estimatedProcessingTimeInSeconds: 0,
  slippagePercentage: 0,
};

/**
 * Cross-chain swap (ETH Ethereum → USDC Linea). Maps as `swap` ("Swapped").
 */
export const buildConfirmedLocalCrossChainSwapTransaction =
  (): TransactionMeta =>
    ({
      id: 'activity-cv-confirmed-cross-chain-swap',
      hash: '0xactivitycvcrosschainswap',
      chainId: '0x1',
      status: TransactionStatus.confirmed,
      time: 1_716_367_789_000,
      type: TransactionType.swap,
      txParams: {
        from: ACTIVITY_CV_ACCOUNT,
        to: ACTIVITY_CV_USDC,
        value: '0xde0b6b3a7640000',
        nonce: '0x8',
      },
      txReceipt: { status: '0x1' },
    }) as unknown as TransactionMeta;

/** Quote for {@link buildConfirmedLocalCrossChainSwapTransaction}. */
export const activityCvCrossChainSwapBridgeHistoryEntry = {
  txMetaId: 'activity-cv-confirmed-cross-chain-swap',
  account: ACTIVITY_CV_ACCOUNT,
  quote: {
    srcChainId: 1,
    destChainId: 59144,
    srcAsset: {
      symbol: 'ETH',
      decimals: 18,
      assetId: 'eip155:1/slip44:60',
    },
    destAsset: {
      symbol: 'USDC',
      decimals: 6,
      assetId: `eip155:59144/erc20:${ACTIVITY_CV_USDC.toLowerCase()}`,
    },
    srcTokenAmount: '1000000000000000000',
    destTokenAmount: '1000000',
  },
  status: {
    srcChain: {
      chainId: 1,
      txHash: '0xactivitycvcrosschainswap',
    },
    destChain: {
      chainId: 59144,
      txHash: '0xactivitycvcrosschainswapdest',
    },
  },
  startTime: 1_716_367_789_000,
  estimatedProcessingTimeInSeconds: 0,
  slippagePercentage: 0,
};

/**
 * Submitted cross-chain swap for ActivityDetails pending status CV.
 * Same quote shape as the confirmed fixture; status is still in-flight.
 */
export const buildPendingLocalCrossChainSwapTransaction = (): TransactionMeta =>
  ({
    id: 'activity-cv-pending-cross-chain-swap',
    hash: '0xactivitycvpendingcrosschainswap',
    chainId: '0x1',
    status: TransactionStatus.submitted,
    time: 1_716_367_789_500,
    type: TransactionType.swap,
    txParams: {
      from: ACTIVITY_CV_ACCOUNT,
      to: ACTIVITY_CV_USDC,
      value: '0xde0b6b3a7640000',
      nonce: '0x9',
    },
  }) as unknown as TransactionMeta;

/** Quote for {@link buildPendingLocalCrossChainSwapTransaction}. */
export const activityCvPendingCrossChainSwapBridgeHistoryEntry = {
  ...activityCvCrossChainSwapBridgeHistoryEntry,
  txMetaId: 'activity-cv-pending-cross-chain-swap',
  status: {
    srcChain: {
      chainId: 1,
      txHash: '0xactivitycvpendingcrosschainswap',
    },
    destChain: {
      chainId: 59144,
    },
  },
  startTime: 1_716_367_789_500,
};

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

/** Market question used as subtitle on Predict trade/claim Activity CV rows. */
export const ACTIVITY_CV_PREDICT_MARKET_TITLE =
  'Will Spain win the 2026 FIFA World Cup?';

const ACTIVITY_CV_PREDICT_MARKET_ICON = 'https://example.com/spain.png';

/** ERC-20 `transfer(to, amount)` calldata for Predict deposit/withdraw batches. */
const buildErc20TransferCalldata = (to: string, amount: bigint): string =>
  `0xa9059cbb${to.slice(2).toLowerCase().padStart(64, '0')}${amount
    .toString(16)
    .padStart(64, '0')}`;

/** 4,000 USDC (6 decimals) — funded / withdrawal CV fixtures. */
const ACTIVITY_CV_PREDICT_USDC_AMOUNT = 4_000_000_000n;

/**
 * Confirmed Predict deposit batch → `predictionsAddFunds` under Predictions filter.
 */
export const buildConfirmedLocalPredictDepositTransaction =
  (): TransactionMeta =>
    ({
      id: 'activity-cv-predict-deposit',
      hash: '0xactivitycvpredictdeposit',
      chainId: '0x1',
      status: TransactionStatus.confirmed,
      time: 1_716_367_790_000,
      type: TransactionType.batch,
      txParams: {
        from: ACTIVITY_CV_ACCOUNT,
        to: ACTIVITY_CV_ACCOUNT,
        value: '0x0',
        nonce: '0x9',
      },
      nestedTransactions: [
        {
          type: TransactionType.predictDeposit,
          to: ACTIVITY_CV_USDC,
          data: buildErc20TransferCalldata(
            ACTIVITY_CV_RECIPIENT,
            ACTIVITY_CV_PREDICT_USDC_AMOUNT,
          ),
        },
      ],
      txReceipt: { status: '0x1' },
    }) as unknown as TransactionMeta;

/**
 * Confirmed Predict withdraw batch → `predictionsWithdrawFunds` under Predictions filter.
 */
export const buildConfirmedLocalPredictWithdrawTransaction =
  (): TransactionMeta =>
    ({
      id: 'activity-cv-predict-withdraw',
      hash: '0xactivitycvpredictwithdraw',
      chainId: '0x1',
      status: TransactionStatus.confirmed,
      time: 1_716_367_791_000,
      type: TransactionType.batch,
      txParams: {
        from: ACTIVITY_CV_ACCOUNT,
        to: ACTIVITY_CV_ACCOUNT,
        value: '0x0',
        nonce: '0xa',
      },
      nestedTransactions: [
        {
          type: TransactionType.predictWithdraw,
          to: ACTIVITY_CV_USDC,
          data: buildErc20TransferCalldata(
            ACTIVITY_CV_ACCOUNT,
            ACTIVITY_CV_PREDICT_USDC_AMOUNT,
          ),
        },
      ],
      txReceipt: { status: '0x1' },
    }) as unknown as TransactionMeta;

/** Provider feed buy → `predictionPlaced` (negative primary, market subtitle). */
export const buildPredictBuyActivity = (): PredictActivity => ({
  id: 'activity-cv-predict-buy',
  providerId: 'polymarket',
  title: ACTIVITY_CV_PREDICT_MARKET_TITLE,
  icon: ACTIVITY_CV_PREDICT_MARKET_ICON,
  outcome: 'Yes',
  entry: {
    type: 'buy',
    timestamp: 1_716_367_792,
    marketId: 'm-cv-1',
    outcomeId: 'o-cv-1',
    outcomeTokenId: 1,
    amount: 3,
    price: 0.42,
  },
});

/** Provider feed sell → `predictionCashedOut` (positive primary, market subtitle). */
export const buildPredictSellActivity = (): PredictActivity => ({
  id: 'activity-cv-predict-sell',
  providerId: 'polymarket',
  title: ACTIVITY_CV_PREDICT_MARKET_TITLE,
  icon: ACTIVITY_CV_PREDICT_MARKET_ICON,
  outcome: 'Yes',
  entry: {
    type: 'sell',
    timestamp: 1_716_367_793,
    marketId: 'm-cv-1',
    outcomeId: 'o-cv-1',
    outcomeTokenId: 1,
    amount: 75,
    price: 0.6,
  },
});

/** Provider feed claim → `predictionClaimWinnings` (positive primary, market subtitle). */
export const buildPredictClaimActivity = (): PredictActivity => ({
  id: 'activity-cv-predict-claim',
  providerId: 'polymarket',
  title: ACTIVITY_CV_PREDICT_MARKET_TITLE,
  icon: ACTIVITY_CV_PREDICT_MARKET_ICON,
  entry: {
    type: 'claimWinnings',
    timestamp: 1_716_367_794,
    amount: 250,
  },
});

/** Remote flag shape that enables PredictActivitySource on ActivityScreen CV. */
export const activityPredictTradingEnabledFlag = {
  predictTradingEnabled: {
    enabled: true,
    minimumVersion: '0.0.0',
  },
} as const;

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
            tokenSortConfig: {
              key: 'tokenFiatAmount',
              order: 'dsc',
              sortCallback: 'stringNumeric',
            },
          },
          SmartTransactionsController: {
            smartTransactionsState: {
              smartTransactions: {},
            },
          },
          TokenBalancesController: {
            tokenBalances: {},
          },
          NftController: {
            allNfts: {},
            allNftContracts: {},
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

/** State for ActivityList tests that load EVM history from the accounts API. */
export const initialStateActivityWithAccountsApi = () =>
  initialStateActivity().withOverrides({
    engine: {
      backgroundState: {
        NetworkEnablementController: {
          enabledNetworkMap: enabledMainnetNetworkMap,
        },
        PreferencesController: {
          privacyMode: false,
        },
      },
    },
  } as unknown as DeepPartial<RootState>);

/** Solana mainnet scope used by ActivityDetails non-EVM fiat CV. */
export const ACTIVITY_CV_SOLANA_CHAIN_ID =
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

export const ACTIVITY_CV_SOLANA_ACCOUNT_ID = 'activity-cv-solana-acc';

export const ACTIVITY_CV_SOLANA_ADDRESS = '11111111111111111111111111111111';

export const ACTIVITY_CV_SOLANA_SEND_ID = 'activity-cv-solana-send';

export const ACTIVITY_CV_SOLANA_ASSET_ID =
  `${ACTIVITY_CV_SOLANA_CHAIN_ID}/slip44:501` as const;

/**
 * Confirmed Solana native send (2 SOL). Keyring amounts are human-readable.
 * Pair with {@link activityCvSolanaSendStateOverrides} for details fiat CV.
 */
export const activityCvSolanaSendTransaction = {
  id: ACTIVITY_CV_SOLANA_SEND_ID,
  chain: ACTIVITY_CV_SOLANA_CHAIN_ID,
  account: ACTIVITY_CV_SOLANA_ACCOUNT_ID,
  status: 'confirmed',
  timestamp: 1_716_367_795,
  type: 'send',
  from: [
    {
      address: ACTIVITY_CV_SOLANA_ADDRESS,
      asset: {
        fungible: true,
        type: ACTIVITY_CV_SOLANA_ASSET_ID,
        unit: 'SOL',
        amount: '2',
      },
    },
  ],
  to: [
    {
      address: 'So11111111111111111111111111111111111111112',
      asset: null,
    },
  ],
  fees: [],
  events: [],
};

/**
 * Redux overrides: Solana account in the selected group, non-EVM send history,
 * and multichain rate 4 → 2 SOL totals $8 on ActivityDetails.
 */
export const activityCvSolanaSendStateOverrides = {
  engine: {
    backgroundState: {
      AccountsController: {
        internalAccounts: {
          accounts: {
            [ACTIVITY_CV_SOLANA_ACCOUNT_ID]: {
              id: ACTIVITY_CV_SOLANA_ACCOUNT_ID,
              address: ACTIVITY_CV_SOLANA_ADDRESS,
              type: 'solana:data-account',
              options: {},
              methods: [],
              metadata: {
                name: 'Solana Account 1',
                importTime: 1,
                keyring: { type: 'Snap Keyring' },
              },
              scopes: [ACTIVITY_CV_SOLANA_CHAIN_ID],
            },
          },
        },
      },
      AccountTreeController: {
        accountTree: {
          wallets: {
            'entropy:wallet1': {
              id: 'entropy:wallet1',
              type: 'Entropy',
              metadata: { name: 'Wallet 1', entropy: { id: 'wallet1' } },
              groups: {
                'entropy:wallet1/0': {
                  id: 'entropy:wallet1/0',
                  type: 'MultipleAccount',
                  metadata: {
                    name: 'Group 1',
                    pinned: false,
                    hidden: false,
                    lastSelected: 0,
                  },
                  accounts: ['acc-1', ACTIVITY_CV_SOLANA_ACCOUNT_ID],
                },
              },
            },
          },
        },
        selectedAccountGroup: 'entropy:wallet1/0',
      },
      MultichainTransactionsController: {
        nonEvmTransactions: {
          [ACTIVITY_CV_SOLANA_ACCOUNT_ID]: {
            [ACTIVITY_CV_SOLANA_CHAIN_ID]: {
              transactions: [activityCvSolanaSendTransaction],
              next: null,
              lastUpdated: 1_716_367_795_000,
            },
          },
        },
      },
      MultichainAssetsRatesController: {
        conversionRates: {
          [ACTIVITY_CV_SOLANA_ASSET_ID]: {
            rate: '4',
            currency: 'usd',
          },
        },
      },
      MultichainNetworkController: {
        isEvmSelected: false,
        selectedMultichainNetworkChainId: ACTIVITY_CV_SOLANA_CHAIN_ID,
      },
    },
  },
} as unknown as DeepPartial<RootState>;
