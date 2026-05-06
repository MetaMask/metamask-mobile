import { CHAIN_IDS, TransactionType } from '@metamask/transaction-controller';
import { SignTypedDataVersion } from '@metamask/keyring-controller';
import { DEFAULT_FEE_COLLECTION_FLAG } from '../../constants/flags';
import type { OrderPreview } from '../types';
import { Side } from '../../types';
import type { PredictFeatureFlags } from '../../types/flags';
import { PolymarketProvider } from './PolymarketProvider';
import {
  DEFAULT_CLOB_BASE_URL,
  MATIC_CONTRACTS_V2,
  POLYMARKET_PROVIDER_ID,
  USDC_E_ADDRESS,
} from './constants';
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
import { buildDepositMaintenanceTransaction } from './preflight/deposit';
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

jest.mock('./preflight/deposit', () => ({
  buildDepositMaintenanceTransaction: jest.fn(),
}));

jest.mock('./preflight/trade', () => ({
  buildTradeAllowancesTx: jest.fn(),
}));

jest.mock('./preflight/withdraw', () => ({
  buildWithdrawTransaction: jest.fn(),
}));

const mockComputeProxyAddress = jest.mocked(computeProxyAddress);
const mockCreateApiKey = jest.mocked(createApiKey);
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
const mockBuildDepositMaintenanceTransaction = jest.mocked(
  buildDepositMaintenanceTransaction,
);
const mockBuildTradeAllowancesTx = jest.mocked(buildTradeAllowancesTx);
const mockBuildWithdrawTransaction = jest.mocked(buildWithdrawTransaction);

const signer = {
  address: '0x1111111111111111111111111111111111111111',
  signPersonalMessage: jest.fn(),
  signTypedMessage: jest.fn(),
};

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
    mockComputeProxyAddress.mockReturnValue(
      '0x9999999999999999999999999999999999999999',
    );
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
    mockBuildDepositMaintenanceTransaction.mockResolvedValue(undefined);
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
      json: jest.fn().mockResolvedValue([]),
    });
    signer.signTypedMessage.mockResolvedValue('0xsigned-order');
  });

  it('exposes the Polymarket provider id', () => {
    expect(createProvider().providerId).toBe(POLYMARKET_PROVIDER_ID);
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
    expect(mockSubmitProtocolClobOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        protocol: expect.objectContaining({
          key: 'v2',
          transport: expect.objectContaining({
            clobBaseUrl: DEFAULT_CLOB_BASE_URL,
            clobVersionHeader: '2',
          }),
        }),
        allowancesTx: {
          to: '0x9999999999999999999999999999999999999999',
          data: '0xallowances',
        },
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
    mockIsSmartContractAddress.mockResolvedValue(false);
    mockBuildDepositMaintenanceTransaction.mockResolvedValue({
      params: {
        to: '0x9999999999999999999999999999999999999999',
        data: '0xmaintenance',
      },
      type: TransactionType.contractInteraction,
    });

    const result = await createProvider().prepareDeposit({ signer });

    expect(result.chainId).toBe(CHAIN_IDS.POLYGON);
    expect(result.transactions).toEqual([
      expect.objectContaining({
        params: { to: '0xFactory', data: '0xdeploy' },
      }),
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
