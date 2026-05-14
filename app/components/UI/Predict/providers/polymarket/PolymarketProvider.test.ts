import {
  CHAIN_IDS,
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { SignTypedDataVersion } from '@metamask/keyring-controller';
import { Interface } from 'ethers/lib/utils';
import { analytics } from '../../../../../util/analytics/analytics';
import { UserProfileProperty } from '../../../../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import {
  DEFAULT_FEE_COLLECTION_FLAG,
  DEFAULT_PREDICT_WORLD_CUP_FLAG,
} from '../../constants/flags';
import type { OrderPreview } from '../types';
import { Side, type PredictPosition } from '../../types';
import type { PredictFeatureFlags } from '../../types/flags';
import { PolymarketProvider } from './PolymarketProvider';
import { OrderType, SignatureType } from './types';
import {
  deriveDepositWalletAddress,
  executeDepositWalletBatch,
  getDepositWalletRelayerTransactionId,
  requestDepositWalletCreate,
  syncDepositWalletCollateralBalanceAllowance,
  toDepositWalletCalls,
  waitForDepositWalletDeployed,
  waitForDepositWalletTransaction,
} from './depositWallet';
import {
  DEFAULT_CLOB_BASE_URL,
  MATIC_CONTRACTS_V2,
  POLYMARKET_PROVIDER_ID,
  USDC_E_ADDRESS,
} from './constants';
import { OperationType } from './safe/types';
import {
  computeProxyAddress,
  createPermit2FeeAuthorization,
  getDeployProxyWalletTransaction,
  getSafeTransferAmount,
  getSafeTransferAmountRaw,
} from './safe/utils';
import {
  createApiKey,
  encodeErc20Transfer,
  getBalance,
  getL2Headers,
  getRawBalance,
  parsePolymarketPositions,
  previewOrder,
} from './utils';
import { submitProtocolClobOrder } from './protocol/transport';
import {
  buildClaimTransaction,
  planDepositWalletClaim,
} from './preflight/claim';
import { buildDepositMaintenanceTransaction } from './preflight/deposit';
import type { SignedSafeExecution } from './preflight/core';
import { planDepositWalletPreflight } from './preflight/depositWallet';
import { buildLegacySafeMigrationSweepTransaction } from './preflight/legacySafeMigration';
import { buildTradeAllowancesTx } from './preflight/trade';
import { buildWithdrawTransaction } from './preflight/withdraw';
import {
  generateTransferData,
  isSmartContractAddress,
} from '../../../../../util/transactions';

jest.mock('../../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: { log: jest.fn() },
}));

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), log: jest.fn() },
}));

jest.mock('../../../../../util/analytics/analytics', () => ({
  analytics: { identify: jest.fn() },
}));

jest.mock('../../../../../util/transactions', () => ({
  generateTransferData: jest.fn(),
  isSmartContractAddress: jest.fn(),
}));

jest.mock('./safe/utils', () => ({
  computeProxyAddress: jest.fn(),
  createPermit2FeeAuthorization: jest.fn(),
  getDeployProxyWalletTransaction: jest.fn(),
  getSafeTransferAmount: jest.fn(),
  getSafeTransferAmountRaw: jest.fn(),
}));

jest.mock('./utils', () => {
  const actual = jest.requireActual('./utils');

  return {
    ...actual,
    createApiKey: jest.fn(),
    encodeErc20Transfer: jest.fn(),
    fetchCarouselFromPolymarketApi: jest.fn(),
    fetchEventsFromPolymarketApi: jest.fn(),
    getBalance: jest.fn(),
    getL2Headers: jest.fn(),
    getRawBalance: jest.fn(),
    getMarketDetailsFromGammaApi: jest.fn(),
    getPolymarketEndpoints: jest.fn(() => ({
      DATA_API_ENDPOINT: 'https://data-api.polymarket.com',
      GAMMA_API_ENDPOINT: 'https://gamma-api.polymarket.com',
      CLOB_ENDPOINT: 'https://clob.polymarket.com',
      CLOB_RELAYER: 'https://predict.api.cx.metamask.io',
      GEOBLOCK_API_ENDPOINT: 'https://polymarket.com/api/geoblock',
    })),
    parsePolymarketActivity: jest.fn(),
    parsePolymarketEvents: jest.fn(),
    parsePolymarketPositions: jest.fn(),
    previewOrder: jest.fn(),
  };
});

jest.mock('./protocol/transport', () => ({
  submitProtocolClobOrder: jest.fn(),
}));

jest.mock('./depositWallet', () => ({
  deriveDepositWalletAddress: jest.fn(),
  executeDepositWalletBatch: jest.fn(),
  getDepositWalletRelayerTransactionId: jest.fn(),
  requestDepositWalletCreate: jest.fn(),
  syncDepositWalletCollateralBalanceAllowance: jest.fn(),
  toDepositWalletCalls: jest.fn(),
  waitForDepositWalletDeployed: jest.fn(),
  waitForDepositWalletTransaction: jest.fn(),
}));

jest.mock('./preflight/claim', () => ({
  buildClaimTransaction: jest.fn(),
  planDepositWalletClaim: jest.fn(),
}));

jest.mock('./preflight/deposit', () => ({
  buildDepositMaintenanceTransaction: jest.fn(),
}));

jest.mock('./preflight/depositWallet', () => ({
  planDepositWalletPreflight: jest.fn(),
}));

jest.mock('./preflight/legacySafeMigration', () => ({
  buildLegacySafeMigrationSweepTransaction: jest.fn(),
}));

jest.mock('./preflight/trade', () => ({
  buildTradeAllowancesTx: jest.fn(),
}));

jest.mock('./preflight/withdraw', () => ({
  buildWithdrawTransaction: jest.fn(),
}));

const mockAnalyticsIdentify = jest.mocked(analytics.identify);
const mockComputeProxyAddress = jest.mocked(computeProxyAddress);
const mockCreateApiKey = jest.mocked(createApiKey);
const mockDeriveDepositWalletAddress = jest.mocked(deriveDepositWalletAddress);
const mockExecuteDepositWalletBatch = jest.mocked(executeDepositWalletBatch);
const mockGetDepositWalletRelayerTransactionId = jest.mocked(
  getDepositWalletRelayerTransactionId,
);
const mockCreatePermit2FeeAuthorization = jest.mocked(
  createPermit2FeeAuthorization,
);
const mockEncodeErc20Transfer = jest.mocked(encodeErc20Transfer);
const mockGenerateTransferData = jest.mocked(generateTransferData);
const mockGetBalance = jest.mocked(getBalance);
const mockGetDeployProxyWalletTransaction = jest.mocked(
  getDeployProxyWalletTransaction,
);
const mockGetL2Headers = jest.mocked(getL2Headers);
const mockGetRawBalance = jest.mocked(getRawBalance);
const mockGetSafeTransferAmount = jest.mocked(getSafeTransferAmount);
const mockGetSafeTransferAmountRaw = jest.mocked(getSafeTransferAmountRaw);
const mockIsSmartContractAddress = jest.mocked(isSmartContractAddress);
const mockParsePolymarketPositions = jest.mocked(parsePolymarketPositions);
const mockPreviewOrder = jest.mocked(previewOrder);
const mockSubmitProtocolClobOrder = jest.mocked(submitProtocolClobOrder);
const mockBuildClaimTransaction = jest.mocked(buildClaimTransaction);
const mockPlanDepositWalletClaim = jest.mocked(planDepositWalletClaim);
const mockBuildDepositMaintenanceTransaction = jest.mocked(
  buildDepositMaintenanceTransaction,
);
const mockPlanDepositWalletPreflight = jest.mocked(planDepositWalletPreflight);
const mockBuildLegacySafeMigrationSweepTransaction = jest.mocked(
  buildLegacySafeMigrationSweepTransaction,
);
const mockRequestDepositWalletCreate = jest.mocked(requestDepositWalletCreate);
const mockSyncDepositWalletCollateralBalanceAllowance = jest.mocked(
  syncDepositWalletCollateralBalanceAllowance,
);
const mockToDepositWalletCalls = jest.mocked(toDepositWalletCalls);
const mockWaitForDepositWalletDeployed = jest.mocked(
  waitForDepositWalletDeployed,
);
const mockWaitForDepositWalletTransaction = jest.mocked(
  waitForDepositWalletTransaction,
);
const mockBuildTradeAllowancesTx = jest.mocked(buildTradeAllowancesTx);
const mockBuildWithdrawTransaction = jest.mocked(buildWithdrawTransaction);

const depositWalletAddress = '0x2222222222222222222222222222222222222222';
const legacySafeAddress = '0x9999999999999999999999999999999999999999';
const signer = {
  address: '0x1111111111111111111111111111111111111111',
  signPersonalMessage: jest.fn(),
  signTypedMessage: jest.fn(),
};

const erc20Interface = new Interface([
  'function transfer(address to, uint256 value)',
]);

function createDepositTransactionMeta({
  recipient,
  tokenAddress = MATIC_CONTRACTS_V2.collateral,
  type = TransactionType.predictDeposit,
}: {
  recipient: string;
  tokenAddress?: string;
  type?: TransactionType;
}): TransactionMeta {
  return {
    id: 'tx-1',
    txParams: {
      from: signer.address,
      to: tokenAddress,
      value: '0x0',
      data: '0x',
    },
    nestedTransactions: [
      {
        type,
        to: tokenAddress,
        data: erc20Interface.encodeFunctionData('transfer', [recipient, 0]),
      },
    ],
  } as TransactionMeta;
}

function createClaimPosition(
  overrides: Partial<PredictPosition> = {},
): PredictPosition {
  return {
    id: 'position-1',
    providerId: POLYMARKET_PROVIDER_ID,
    marketId: 'market-1',
    outcomeId:
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    outcome: 'Yes',
    outcomeTokenId: 'token-1',
    currentValue: 1,
    title: 'Market',
    icon: '',
    amount: 1,
    price: 1,
    status: 'open',
    size: 1,
    outcomeIndex: 0,
    percentPnl: 0,
    cashPnl: 0,
    claimable: true,
    initialValue: 1,
    avgPrice: 1,
    endDate: new Date(0).toISOString(),
    negRisk: false,
    ...overrides,
  } as PredictPosition;
}

async function flushPromises(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

const basePreview: OrderPreview = {
  marketId: 'market-1',
  outcomeId:
    '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  outcomeTokenId: '123',
  timestamp: 1,
  side: Side.BUY,
  sharePrice: 0.5,
  maxAmountSpent: 10,
  minAmountReceived: 19,
  slippage: 0.03,
  tickSize: 0.01,
  minOrderSize: 1,
  negRisk: false,
  feeRateBps: '99',
};

const defaultFeatureFlags: PredictFeatureFlags = {
  feeCollection: DEFAULT_FEE_COLLECTION_FLAG,
  liveSportsLeagues: [],
  extendedSportsMarketsLeagues: [],
  marketHighlightsFlag: {
    enabled: false,
    highlights: [],
    minimumVersion: '7.64.0',
  },
  fakOrdersEnabled: false,
  predictWithAnyTokenEnabled: false,
  predictUpDownEnabled: false,
  predictWorldCup: DEFAULT_PREDICT_WORLD_CUP_FLAG,
};

function createProvider(featureFlags?: Partial<PredictFeatureFlags>) {
  return new PolymarketProvider({
    getFeatureFlags: () => ({ ...defaultFeatureFlags, ...featureFlags }),
  });
}

describe('PolymarketProvider', () => {
  const originalBuilderCode = process.env.MM_PREDICT_BUILDER_CODE;

  beforeAll(() => {
    process.env.MM_PREDICT_BUILDER_CODE =
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  });

  afterAll(() => {
    if (originalBuilderCode === undefined) {
      delete process.env.MM_PREDICT_BUILDER_CODE;
      return;
    }

    process.env.MM_PREDICT_BUILDER_CODE = originalBuilderCode;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockComputeProxyAddress.mockReturnValue(legacySafeAddress);
    mockDeriveDepositWalletAddress.mockReturnValue(depositWalletAddress);
    mockCreateApiKey.mockResolvedValue({
      apiKey: 'api-key',
      secret: 'secret',
      passphrase: 'passphrase',
    });
    mockGetL2Headers.mockResolvedValue({
      POLY_ADDRESS: signer.address,
      POLY_SIGNATURE: 'sig',
      POLY_TIMESTAMP: '1',
      POLY_API_KEY: 'api-key',
      POLY_PASSPHRASE: 'passphrase',
    });
    mockParsePolymarketPositions.mockResolvedValue([]);
    mockSubmitProtocolClobOrder.mockResolvedValue({
      success: true,
      response: {
        success: true,
        orderID: 'order-1',
        makingAmount: '10',
        takingAmount: '19',
      },
    });
    mockPreviewOrder.mockResolvedValue(basePreview);
    mockBuildTradeAllowancesTx.mockResolvedValue({
      to: '0x9999999999999999999999999999999999999999',
      data: '0xallowances',
    });
    mockGenerateTransferData.mockReturnValue('0xtransferData');
    mockIsSmartContractAddress.mockResolvedValue(true);
    mockGetDeployProxyWalletTransaction.mockResolvedValue({
      params: { to: '0xFactory', data: '0xdeploy' },
      type: TransactionType.contractInteraction,
    });
    mockBuildClaimTransaction.mockResolvedValue({
      params: {
        to: legacySafeAddress as `0x${string}`,
        data: '0xsignedClaim' as `0x${string}`,
      },
      type: TransactionType.predictClaim,
    });
    mockPlanDepositWalletClaim.mockResolvedValue([
      {
        target: MATIC_CONTRACTS_V2.collateral,
        value: '0',
        data: '0xclaim',
      },
    ]);
    mockBuildDepositMaintenanceTransaction.mockResolvedValue(undefined);
    mockBuildLegacySafeMigrationSweepTransaction.mockResolvedValue(undefined);
    mockGetDepositWalletRelayerTransactionId.mockImplementation(
      (response) => response.transactionID ?? response.id,
    );
    mockRequestDepositWalletCreate.mockResolvedValue({
      transactionID: 'create-1',
    });
    mockPlanDepositWalletPreflight.mockResolvedValue({
      missingRequirements: [],
      transactions: [],
    });
    mockToDepositWalletCalls.mockImplementation((transactions) =>
      transactions.map((transaction) => ({
        target: transaction.to,
        value: transaction.value,
        data: transaction.data,
      })),
    );
    mockExecuteDepositWalletBatch.mockResolvedValue({
      transactionID: 'batch-1',
    });
    mockWaitForDepositWalletDeployed.mockResolvedValue(undefined);
    mockWaitForDepositWalletTransaction.mockResolvedValue(
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    );
    mockSyncDepositWalletCollateralBalanceAllowance.mockResolvedValue(
      undefined,
    );
    mockEncodeErc20Transfer.mockReturnValue('0xtransfer');
    mockGetRawBalance.mockResolvedValue(0n);
    mockGetSafeTransferAmount.mockReturnValue(1);
    mockGetSafeTransferAmountRaw.mockReturnValue(1_000_000n);
    mockBuildWithdrawTransaction.mockResolvedValue({
      params: {
        to: '0x9999999999999999999999999999999999999999',
        data: '0xsignedWithdraw',
      },
      type: TransactionType.predictWithdraw,
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue([{}]),
    });
    signer.signTypedMessage.mockResolvedValue('0xsigned-order');
  });

  it('exposes the Polymarket provider id', () => {
    expect(createProvider().providerId).toBe(POLYMARKET_PROVIDER_ID);
  });

  it('routes to deposit wallet when legacy Safe is not deployed', async () => {
    mockIsSmartContractAddress
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    const accountState = await createProvider().getAccountState({
      ownerAddress: signer.address,
    });

    expect(accountState).toEqual({
      address: depositWalletAddress,
      isDeployed: true,
      walletType: 'deposit-wallet',
    });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockIsSmartContractAddress).toHaveBeenNthCalledWith(
      1,
      legacySafeAddress,
      '0x89',
    );
    expect(mockIsSmartContractAddress).toHaveBeenNthCalledWith(
      2,
      depositWalletAddress,
      '0x89',
    );
  });

  it('keeps legacy Safe users only when raw Activity API has activity', async () => {
    const accountState = await createProvider().getAccountState({
      ownerAddress: signer.address,
    });

    expect(accountState).toEqual({
      address: legacySafeAddress,
      isDeployed: true,
      walletType: 'safe',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      `https://data-api.polymarket.com/activity?user=${legacySafeAddress}&limit=1`,
    );
  });

  it('routes deployed legacy Safe with empty raw activity to deposit wallet', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue([]),
    });
    mockIsSmartContractAddress
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    const accountState = await createProvider().getAccountState({
      ownerAddress: signer.address,
    });

    expect(accountState).toEqual({
      address: depositWalletAddress,
      isDeployed: false,
      walletType: 'deposit-wallet',
    });
  });

  it('fails closed when raw Activity API fails for a deployed legacy Safe', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: jest.fn(),
    });

    await expect(
      createProvider().getAccountState({ ownerAddress: signer.address }),
    ).rejects.toThrow('Failed to fetch Polymarket activity');
  });

  it('previews orders through canonical CLOB v2 with zero fee-rate bps', async () => {
    const provider = createProvider();

    const preview = await provider.previewOrder({
      ...basePreview,
      size: 10,
      signer,
    });

    expect(preview.feeRateBps).toBe('0');
    expect(mockPreviewOrder).toHaveBeenCalledWith(
      expect.objectContaining({ feeCollection: DEFAULT_FEE_COLLECTION_FLAG }),
    );
  });

  it('submits orders through the protocol CLOB v2 relayer path', async () => {
    const provider = createProvider();

    const result = await provider.placeOrder({ signer, preview: basePreview });

    expect(result.success).toBe(true);
    expect(mockCreateApiKey).toHaveBeenCalledWith({ address: signer.address });
    expect(signer.signTypedMessage).toHaveBeenCalledWith(
      expect.any(Object),
      SignTypedDataVersion.V4,
    );
    expect(mockGetL2Headers).toHaveBeenCalledWith(
      expect.objectContaining({ address: signer.address }),
    );
    expect(mockSubmitProtocolClobOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        protocol: expect.objectContaining({
          key: 'v2',
          transport: expect.objectContaining({
            clobBaseUrl: DEFAULT_CLOB_BASE_URL,
            clobVersionHeader: '2',
          }),
        }),
        clobOrder: expect.objectContaining({
          order: expect.objectContaining({
            maker: legacySafeAddress,
            signer: signer.address,
            signatureType: SignatureType.POLY_GNOSIS_SAFE,
          }),
        }),
        allowancesTx: {
          to: '0x9999999999999999999999999999999999999999',
          data: '0xallowances',
        },
      }),
    );
  });

  it('submits deposit-wallet orders with POLY_1271 payload and no Safe trade preflight fields', async () => {
    const innerSignature = `0x${'11'.repeat(65)}`;
    signer.signTypedMessage.mockResolvedValueOnce(innerSignature);
    mockIsSmartContractAddress
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    const provider = createProvider({
      fakOrdersEnabled: true,
      feeCollection: {
        ...DEFAULT_FEE_COLLECTION_FLAG,
        permit2Enabled: true,
        executors: ['0x4444444444444444444444444444444444444444'],
      },
    });

    const result = await provider.placeOrder({
      signer,
      preview: {
        ...basePreview,
        fees: {
          metamaskFee: 0.05,
          providerFee: 0.05,
          totalFee: 0.1,
          totalFeePercentage: 1,
          collector: '0x3333333333333333333333333333333333333333',
          executors: ['0x4444444444444444444444444444444444444444'],
          permit2Enabled: true,
        },
      },
    });

    expect(result.success).toBe(true);
    expect(mockCreateApiKey).toHaveBeenCalledWith({ address: signer.address });
    expect(mockBuildTradeAllowancesTx).not.toHaveBeenCalled();
    expect(mockCreatePermit2FeeAuthorization).not.toHaveBeenCalled();
    expect(mockGetL2Headers).toHaveBeenCalledWith(
      expect.objectContaining({ address: signer.address }),
    );
    expect(signer.signTypedMessage).toHaveBeenCalledWith(
      {
        from: signer.address,
        data: expect.objectContaining({
          primaryType: 'TypedDataSign',
          message: expect.objectContaining({
            verifyingContract: depositWalletAddress,
          }),
        }),
      },
      SignTypedDataVersion.V4,
    );
    expect(mockSubmitProtocolClobOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        clobOrder: expect.objectContaining({
          orderType: OrderType.FAK,
          order: expect.objectContaining({
            maker: depositWalletAddress,
            signer: depositWalletAddress,
            signatureType: SignatureType.POLY_1271,
            signature: expect.stringMatching(/^0x11+/u),
          }),
        }),
        feeAuthorization: undefined,
        executor: undefined,
        allowancesTx: undefined,
      }),
    );
  });

  it('runs deposit-wallet setup before submitting deposit-wallet orders', async () => {
    const repairTransaction = {
      to: '0x4444444444444444444444444444444444444444',
      data: '0xrepair',
      operation: OperationType.Call,
      value: '0',
    };
    mockIsSmartContractAddress
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false);
    mockPlanDepositWalletPreflight.mockResolvedValue({
      missingRequirements: [
        {
          type: 'erc20-allowance',
          tokenAddress: repairTransaction.to,
          spender: '0x5555555555555555555555555555555555555555',
        },
      ],
      transactions: [repairTransaction],
    });

    const result = await createProvider().placeOrder({
      signer,
      preview: basePreview,
    });

    expect(result.success).toBe(true);
    expect(mockRequestDepositWalletCreate).toHaveBeenCalledWith({
      ownerAddress: signer.address,
    });
    expect(mockExecuteDepositWalletBatch).toHaveBeenCalledWith({
      signer,
      walletAddress: depositWalletAddress,
      calls: [
        {
          target: repairTransaction.to,
          data: repairTransaction.data,
          value: repairTransaction.value,
        },
      ],
    });
    expect(
      mockSyncDepositWalletCollateralBalanceAllowance,
    ).toHaveBeenCalledWith({
      protocol: expect.objectContaining({ key: 'v2' }),
      signerAddress: signer.address,
      apiKey: expect.objectContaining({ apiKey: 'api-key' }),
    });
    expect(
      mockExecuteDepositWalletBatch.mock.invocationCallOrder[0],
    ).toBeLessThan(mockSubmitProtocolClobOrder.mock.invocationCallOrder[0]);
  });

  it('passes legacy Safe migration sweep as allowancesTx for deposit-wallet orders', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue([]),
    });
    mockIsSmartContractAddress
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);
    const sweepTransaction: SignedSafeExecution = {
      params: {
        to: legacySafeAddress as `0x${string}`,
        data: '0xsweep' as `0x${string}`,
      },
      type: TransactionType.contractInteraction,
    };
    mockBuildLegacySafeMigrationSweepTransaction.mockResolvedValue(
      sweepTransaction,
    );

    const result = await createProvider().placeOrder({
      signer,
      preview: basePreview,
    });

    expect(result.success).toBe(true);
    expect(mockBuildLegacySafeMigrationSweepTransaction).toHaveBeenCalledWith({
      signer,
      legacySafeAddress,
      depositWalletAddress,
      protocol: expect.objectContaining({ key: 'v2' }),
    });
    expect(mockSubmitProtocolClobOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        clobOrder: expect.objectContaining({
          order: expect.objectContaining({
            maker: depositWalletAddress,
            signer: depositWalletAddress,
            signatureType: SignatureType.POLY_1271,
          }),
        }),
        allowancesTx: sweepTransaction.params,
      }),
    );
  });

  it('uses pUSD Permit2 fee authorization when fees are present', async () => {
    mockCreatePermit2FeeAuthorization.mockResolvedValue({
      type: 'safe-permit2',
      authorization: {
        permit: {
          permitted: { token: MATIC_CONTRACTS_V2.collateral, amount: '100000' },
          nonce: '1',
          deadline: '2',
        },
        spender: '0x2222222222222222222222222222222222222222',
        signature: '0xsig',
      },
    });

    const provider = createProvider({
      feeCollection: {
        ...DEFAULT_FEE_COLLECTION_FLAG,
        permit2Enabled: true,
        executors: ['0x2222222222222222222222222222222222222222'],
      },
    });

    await provider.placeOrder({
      signer,
      preview: {
        ...basePreview,
        fees: {
          metamaskFee: 0.05,
          providerFee: 0.05,
          totalFee: 0.1,
          totalFeePercentage: 1,
          collector: '0x3333333333333333333333333333333333333333',
          executors: ['0x2222222222222222222222222222222222222222'],
          permit2Enabled: true,
        },
      },
    });

    expect(mockCreatePermit2FeeAuthorization).toHaveBeenCalledWith(
      expect.objectContaining({
        safeAddress: '0x9999999999999999999999999999999999999999',
        tokenAddress: MATIC_CONTRACTS_V2.collateral,
      }),
    );
  });

  it('prepares pUSD deposits and optional legacy sweep maintenance', async () => {
    mockBuildDepositMaintenanceTransaction.mockResolvedValue({
      params: {
        to: '0x9999999999999999999999999999999999999999',
        data: '0xmaintenance',
      },
      type: TransactionType.contractInteraction,
    });

    const result = await createProvider().prepareDeposit({ signer });

    expect(result.chainId).toBe(CHAIN_IDS.POLYGON);
    expect(mockGetDeployProxyWalletTransaction).not.toHaveBeenCalled();
    expect(result.transactions).toEqual([
      {
        params: {
          to: MATIC_CONTRACTS_V2.collateral,
          data: '0xtransferData',
        },
        type: TransactionType.predictDeposit,
      },
      expect.objectContaining({
        params: {
          to: '0x9999999999999999999999999999999999999999',
          data: '0xmaintenance',
        },
      }),
    ]);
  });

  it('prepares deposit-wallet deposits with optional legacy Safe sweep first', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue([]),
    });
    mockIsSmartContractAddress
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const sweepTransaction: SignedSafeExecution = {
      params: {
        to: legacySafeAddress,
        data: '0xsweep',
      },
      type: TransactionType.contractInteraction,
    };
    mockBuildLegacySafeMigrationSweepTransaction.mockResolvedValue(
      sweepTransaction,
    );

    const result = await createProvider().prepareDeposit({ signer });

    expect(result.chainId).toBe(CHAIN_IDS.POLYGON);
    expect(mockBuildLegacySafeMigrationSweepTransaction).toHaveBeenCalledWith({
      signer,
      legacySafeAddress,
      depositWalletAddress,
      protocol: expect.objectContaining({ key: 'v2' }),
    });
    expect(result.transactions).toEqual([
      sweepTransaction,
      {
        params: {
          to: MATIC_CONTRACTS_V2.collateral,
          data: '0xtransferData',
        },
        type: TransactionType.predictDeposit,
      },
    ]);
    expect(mockRequestDepositWalletCreate).not.toHaveBeenCalled();
    expect(mockPlanDepositWalletPreflight).not.toHaveBeenCalled();
  });

  it('reads displayed Predict balance from pUSD plus legacy USDC.e', async () => {
    mockGetBalance.mockResolvedValue(12.5);
    mockGetRawBalance.mockResolvedValue(2_500_000n);

    const balance = await createProvider().getBalance({
      address: signer.address,
    });

    expect(balance).toBe(15);
    expect(mockGetBalance).toHaveBeenCalledTimes(1);
    expect(mockGetBalance).toHaveBeenCalledWith({
      address: '0x9999999999999999999999999999999999999999',
      tokenAddress: MATIC_CONTRACTS_V2.collateral,
    });
    expect(mockGetRawBalance).toHaveBeenCalledWith({
      address: '0x9999999999999999999999999999999999999999',
      tokenAddress: USDC_E_ADDRESS,
    });
  });

  it('caches zero legacy USDC.e balances in memory', async () => {
    mockGetBalance.mockResolvedValue(12.5);
    mockGetRawBalance.mockResolvedValue(0n);
    const provider = createProvider();

    await provider.getBalance({ address: signer.address });
    await provider.getBalance({ address: signer.address });

    expect(mockGetBalance).toHaveBeenCalledTimes(2);
    expect(mockGetRawBalance).toHaveBeenCalledTimes(1);
  });

  it('runs deposit-wallet beforePublish deployment and allowance preflight', async () => {
    const provider = createProvider();
    const repairTransaction = {
      to: '0x4444444444444444444444444444444444444444',
      data: '0xrepair',
      operation: OperationType.Call,
      value: '0',
    };
    mockIsSmartContractAddress.mockResolvedValueOnce(false);
    mockPlanDepositWalletPreflight.mockResolvedValue({
      missingRequirements: [
        {
          type: 'erc20-allowance',
          tokenAddress: repairTransaction.to,
          spender: '0x5555555555555555555555555555555555555555',
        },
      ],
      transactions: [repairTransaction],
    });

    const result = await provider.beforePublishDepositWalletDeposit({
      transactionMeta: createDepositTransactionMeta({
        recipient: depositWalletAddress,
      }),
      getSigner: () => signer,
    });

    expect(result).toBe(true);
    expect(mockRequestDepositWalletCreate).toHaveBeenCalledWith({
      ownerAddress: signer.address,
    });
    expect(mockWaitForDepositWalletTransaction).toHaveBeenNthCalledWith(1, {
      transactionID: 'create-1',
      requireCompletion: true,
    });
    expect(mockWaitForDepositWalletDeployed).toHaveBeenCalledTimes(1);
    expect(mockWaitForDepositWalletDeployed).toHaveBeenCalledWith({
      walletAddress: depositWalletAddress,
    });
    expect(mockAnalyticsIdentify).toHaveBeenCalledWith({
      [UserProfileProperty.CREATED_POLYMARKET_ACCOUNT_VIA_MM]: true,
    });
    expect(
      mockSyncDepositWalletCollateralBalanceAllowance,
    ).not.toHaveBeenCalled();
    expect(mockPlanDepositWalletPreflight).toHaveBeenCalledWith({
      walletAddress: depositWalletAddress,
      protocol: expect.objectContaining({ key: 'v2' }),
    });
    expect(mockExecuteDepositWalletBatch).toHaveBeenCalledWith({
      signer,
      walletAddress: depositWalletAddress,
      calls: [
        {
          target: repairTransaction.to,
          value: repairTransaction.value,
          data: repairTransaction.data,
        },
      ],
    });
    expect(mockWaitForDepositWalletTransaction).toHaveBeenNthCalledWith(2, {
      transactionID: 'batch-1',
      requireCompletion: true,
    });
  });

  it('waits for WALLET-CREATE polling before submitting allowance batch', async () => {
    const provider = createProvider();
    const repairTransaction = {
      to: '0x4444444444444444444444444444444444444444',
      data: '0xrepair',
      operation: OperationType.Call,
      value: '0',
    };
    let resolveCreateWait: () => void = jest.fn();
    const createWaitPromise = new Promise<`0x${string}`>((resolve) => {
      resolveCreateWait = () =>
        resolve(
          '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
        );
    });
    mockIsSmartContractAddress.mockResolvedValueOnce(false);
    mockPlanDepositWalletPreflight.mockResolvedValue({
      missingRequirements: [
        {
          type: 'erc20-allowance',
          tokenAddress: repairTransaction.to,
          spender: '0x5555555555555555555555555555555555555555',
        },
      ],
      transactions: [repairTransaction],
    });
    mockWaitForDepositWalletTransaction
      .mockImplementationOnce(() => createWaitPromise)
      .mockResolvedValueOnce(
        '0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
      );

    const publishPromise = provider.beforePublishDepositWalletDeposit({
      transactionMeta: createDepositTransactionMeta({
        recipient: depositWalletAddress,
      }),
      getSigner: () => signer,
    });

    await Promise.resolve();

    expect(mockRequestDepositWalletCreate).toHaveBeenCalled();
    expect(mockWaitForDepositWalletDeployed).not.toHaveBeenCalled();
    expect(mockExecuteDepositWalletBatch).not.toHaveBeenCalled();

    resolveCreateWait();
    await publishPromise;

    expect(mockWaitForDepositWalletDeployed).toHaveBeenCalledWith({
      walletAddress: depositWalletAddress,
    });
    expect(mockExecuteDepositWalletBatch).toHaveBeenCalled();
    const deployedCallOrder =
      mockWaitForDepositWalletDeployed.mock.invocationCallOrder[0] ?? 0;
    const executeCallOrder =
      mockExecuteDepositWalletBatch.mock.invocationCallOrder[0] ?? 0;
    expect(deployedCallOrder).toBeLessThan(executeCallOrder);
  });

  it('does not run deposit-wallet beforePublish for Safe deposits', async () => {
    const result = await createProvider().beforePublishDepositWalletDeposit({
      transactionMeta: createDepositTransactionMeta({
        recipient: legacySafeAddress,
      }),
      getSigner: () => signer,
    });

    expect(result).toBe(true);
    expect(mockRequestDepositWalletCreate).not.toHaveBeenCalled();
    expect(mockPlanDepositWalletPreflight).not.toHaveBeenCalled();
  });

  it('marks deposit-wallet claim transactions as externally signed before signing', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue([]),
    });
    mockIsSmartContractAddress
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);
    const provider = createProvider();
    const transactionMeta = {
      id: 'claim-tx',
      txParams: {
        from: signer.address,
        nonce: '0x1',
      },
    } as TransactionMeta;

    const result = await provider.beforeSignClaim({
      transactionMeta,
      signer,
      positions: [createClaimPosition()],
    });

    expect(result?.updateTransaction).toBeDefined();

    result?.updateTransaction?.(transactionMeta);
    expect(transactionMeta.isExternalSign).toBe(true);
    expect(transactionMeta.isGasFeeTokenIgnoredIfBalance).toBe(false);
    expect(transactionMeta.selectedGasFeeToken).toBeUndefined();
    expect(transactionMeta.txParams.nonce).toBeUndefined();
  });

  it('passes through Safe claims before signing', async () => {
    const result = await createProvider().beforeSignClaim({
      transactionMeta: {
        id: 'claim-tx',
        txParams: { from: signer.address },
      } as TransactionMeta,
      signer,
      positions: [createClaimPosition()],
    });

    expect(result).toBeUndefined();
  });

  it('passes through Safe claim publishing', async () => {
    const result = await createProvider().publishClaim({
      transactionMeta: {
        id: 'claim-tx',
        isExternalSign: true,
        txParams: { from: signer.address },
      } as TransactionMeta,
      signer,
      positions: [createClaimPosition()],
    });

    expect(result).toEqual({ transactionHash: undefined });
    expect(mockPlanDepositWalletClaim).not.toHaveBeenCalled();
    expect(mockExecuteDepositWalletBatch).not.toHaveBeenCalled();
  });

  it('publishes deposit-wallet claims through the relayer batch and returns once a hash is available', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue([]),
    });
    mockIsSmartContractAddress
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);
    mockWaitForDepositWalletTransaction.mockResolvedValue(
      '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    );

    const positions = [createClaimPosition()];
    const result = await createProvider().publishClaim({
      transactionMeta: {
        id: 'claim-tx',
        isExternalSign: true,
        txParams: { from: signer.address },
      } as TransactionMeta,
      signer,
      positions,
    });

    expect(mockPlanDepositWalletClaim).toHaveBeenCalledWith({
      positions,
      walletAddress: depositWalletAddress,
      protocol: expect.objectContaining({ key: 'v2' }),
    });
    expect(mockExecuteDepositWalletBatch).toHaveBeenCalledWith({
      signer,
      walletAddress: depositWalletAddress,
      calls: [
        {
          target: MATIC_CONTRACTS_V2.collateral,
          value: '0',
          data: '0xclaim',
        },
      ],
    });
    expect(mockWaitForDepositWalletTransaction).toHaveBeenCalledWith({
      transactionID: 'batch-1',
    });
    expect(result).toEqual({
      transactionHash:
        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    });
  });

  it('requires external-sign metadata before publishing deposit-wallet claims', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue([]),
    });
    mockIsSmartContractAddress
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);

    await expect(
      createProvider().publishClaim({
        transactionMeta: {
          id: 'claim-tx',
          txParams: { from: signer.address },
        } as TransactionMeta,
        signer,
        positions: [createClaimPosition()],
      }),
    ).rejects.toThrow(
      'Deposit wallet claim publish requires external-sign transaction',
    );
  });

  it('syncs deposit-wallet CLOB balance allowance after confirmed claims', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue([]),
    });
    mockIsSmartContractAddress
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);

    createProvider().confirmClaim({
      positions: [createClaimPosition()],
      signer,
    });
    await flushPromises();

    expect(
      mockSyncDepositWalletCollateralBalanceAllowance,
    ).toHaveBeenCalledWith({
      protocol: expect.objectContaining({ key: 'v2' }),
      signerAddress: signer.address,
      apiKey: {
        apiKey: 'api-key',
        secret: 'secret',
        passphrase: 'passphrase',
      },
    });
  });

  it('does not sync claim balance allowance for Safe users', async () => {
    createProvider().confirmClaim({
      positions: [createClaimPosition()],
      signer,
    });
    await flushPromises();

    expect(
      mockSyncDepositWalletCollateralBalanceAllowance,
    ).not.toHaveBeenCalled();
  });

  it('syncs deposit-wallet CLOB balance allowance after matching deposits', async () => {
    await createProvider().syncDepositWalletBalanceAllowanceForDepositTransaction(
      {
        transactionMeta: createDepositTransactionMeta({
          recipient: depositWalletAddress,
        }),
        signerAddress: signer.address,
      },
    );

    expect(
      mockSyncDepositWalletCollateralBalanceAllowance,
    ).toHaveBeenCalledWith({
      protocol: expect.objectContaining({ key: 'v2' }),
      signerAddress: signer.address,
      apiKey: {
        apiKey: 'api-key',
        secret: 'secret',
        passphrase: 'passphrase',
      },
    });
  });

  it('skips CLOB sync for Safe deposits', async () => {
    await createProvider().syncDepositWalletBalanceAllowanceForDepositTransaction(
      {
        transactionMeta: createDepositTransactionMeta({
          recipient: legacySafeAddress,
        }),
        signerAddress: signer.address,
      },
    );

    expect(
      mockSyncDepositWalletCollateralBalanceAllowance,
    ).not.toHaveBeenCalled();
  });

  it('prepares editable pUSD withdraw transfers', async () => {
    const result = await createProvider().prepareWithdraw({ signer });

    expect(result.predictAddress).toBe(
      '0x9999999999999999999999999999999999999999',
    );
    expect(result.transaction).toEqual(
      expect.objectContaining({
        params: expect.objectContaining({
          to: MATIC_CONTRACTS_V2.collateral,
          data: '0xtransfer',
        }),
        type: TransactionType.predictWithdraw,
      }),
    );
  });

  it('signs pUSD Safe withdraw executions', async () => {
    const result = await createProvider().signWithdraw?.({
      signer,
      callData: '0xtransfer',
    });

    expect(mockBuildWithdrawTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        signer,
        safeAddress: '0x9999999999999999999999999999999999999999',
        requestedAmountRaw: 1_000_000n,
        protocol: expect.objectContaining({ key: 'v2' }),
      }),
    );
    expect(result).toEqual({ callData: '0xsignedWithdraw', amount: 1 });
  });
});
