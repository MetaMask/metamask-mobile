import {
  SignTypedDataVersion,
  type TypedMessageParams,
} from '@metamask/keyring-controller';
import { CHAIN_IDS, TransactionType } from '@metamask/transaction-controller';
import { Hex, numberToHex } from '@metamask/utils';
import { parseUnits } from 'ethers/lib/utils';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import Logger, { type LoggerErrorOptions } from '../../../../../util/Logger';
import {
  generateTransferData,
  isSmartContractAddress,
} from '../../../../../util/transactions';
import {
  GetPriceHistoryParams,
  PredictActivity,
  PredictCategory,
  PredictMarket,
  PredictPosition,
  PredictPriceHistoryPoint,
  Side,
  UnrealizedPnL,
} from '../../types';
import {
  AccountState,
  ClaimOrderParams,
  ClaimOrderResponse,
  GetBalanceParams,
  GetMarketsParams,
  GetPositionsParams,
  OrderPreview,
  OrderResult,
  PlaceOrderParams,
  PredictProvider,
  PrepareDepositParams,
  PrepareDepositResponse,
  SignWithdrawParams,
  SignWithdrawResponse,
  PrepareWithdrawParams,
  PrepareWithdrawResponse,
  PreviewOrderParams,
  Signer,
} from '../types';
import { PREDICT_CONSTANTS } from '../../constants/errors';
import {
  BUY_ORDER_RATE_LIMIT_MS,
  FEE_COLLECTOR_ADDRESS,
  MATIC_CONTRACTS,
  POLYGON_MAINNET_CHAIN_ID,
  POLYMARKET_PROVIDER_ID,
  ROUNDING_CONFIG,
} from './constants';
import {
  computeProxyAddress,
  createSafeFeeAuthorization,
  getClaimTransaction,
  getDeployProxyWalletTransaction,
  getProxyWalletAllowancesTransaction,
  getSafeUsdcAmount,
  getWithdrawTransactionCallData,
  hasAllowances,
} from './safe/utils';
import {
  ApiKeyCreds,
  OrderData,
  OrderType,
  PolymarketApiActivity,
  PolymarketPosition,
  SignatureType,
  TickSize,
  UtilsSide,
} from './types';
import {
  createApiKey,
  encodeErc20Transfer,
  generateSalt,
  getBalance,
  getContractConfig,
  getL2Headers,
  getMarketDetailsFromGammaApi,
  getOrderTypedData,
  getParsedMarketsFromPolymarketApi,
  getPolymarketEndpoints,
  parsePolymarketActivity,
  parsePolymarketEvents,
  parsePolymarketPositions,
  previewOrder,
  roundOrderAmount,
  submitClobOrder,
} from './utils';

export type SignTypedMessageFn = (
  params: TypedMessageParams,
  version: SignTypedDataVersion,
) => Promise<string>;

interface RecentlySoldPosition {
  positionId: string;
  timestamp: number;
}

export class PolymarketProvider implements PredictProvider {
  readonly providerId = POLYMARKET_PROVIDER_ID;
  readonly name = 'Polymarket';
  readonly chainId = POLYGON_MAINNET_CHAIN_ID;

  #apiKeysByAddress: Map<string, ApiKeyCreds> = new Map();
  #accountStateByAddress: Map<string, AccountState> = new Map();
  #lastBuyOrderTimestampByAddress: Map<string, number> = new Map();
  #buyOrderInProgressByAddress: Map<string, boolean> = new Map();
  #recentlySoldPositionsByAddress = new Map<string, RecentlySoldPosition[]>();

  private static readonly FALLBACK_CATEGORY: PredictCategory = 'trending';

  /**
   * Generate standard error context for Logger.error calls with searchable tags and context.
   * Enables Sentry dashboard filtering by feature and provider.
   * @param method - The method name where the error occurred
   * @param extra - Optional additional context fields (becomes searchable context data)
   * @returns LoggerErrorOptions with tags (searchable) and context (searchable)
   * @private
   */
  private getErrorContext(
    method: string,
    extra?: Record<string, unknown>,
  ): LoggerErrorOptions {
    return {
      tags: {
        feature: PREDICT_CONSTANTS.FEATURE_NAME,
        provider: POLYMARKET_PROVIDER_ID,
      },
      context: {
        name: 'PolymarketProvider',
        data: {
          method,
          ...extra,
        },
      },
    };
  }

  public async getMarketDetails({
    marketId,
  }: {
    marketId: string;
  }): Promise<PredictMarket> {
    if (!marketId) {
      throw new Error('marketId is required');
    }

    try {
      const event = await getMarketDetailsFromGammaApi({
        marketId,
      });

      const [parsedMarket] = parsePolymarketEvents(
        [event],
        PolymarketProvider.FALLBACK_CATEGORY,
      );

      if (!parsedMarket) {
        throw new Error('Failed to parse market details');
      }

      return parsedMarket;
    } catch (error) {
      DevLogger.log('Error getting market details via Polymarket API:', error);
      throw error;
    }
  }

  public getActivity(_params: { address: string }): Promise<PredictActivity[]> {
    return this.fetchActivity(_params);
  }

  public claimWinnings(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  private async getApiKey({
    address,
  }: {
    address: string;
  }): Promise<ApiKeyCreds> {
    const cachedApiKey = this.#apiKeysByAddress.get(address);
    if (cachedApiKey) {
      return cachedApiKey;
    }

    const apiKeyCreds = await createApiKey({ address });
    this.#apiKeysByAddress.set(address, apiKeyCreds);
    return apiKeyCreds;
  }

  private isRateLimited(address: string): boolean {
    if (this.#buyOrderInProgressByAddress.get(address)) {
      return true;
    }

    const lastTimestamp = this.#lastBuyOrderTimestampByAddress.get(address);
    if (!lastTimestamp) {
      return false;
    }
    const elapsed = Date.now() - lastTimestamp;
    return elapsed < BUY_ORDER_RATE_LIMIT_MS;
  }

  public async getMarkets(params?: GetMarketsParams): Promise<PredictMarket[]> {
    try {
      const markets = await getParsedMarketsFromPolymarketApi(params);
      return markets;
    } catch (error) {
      DevLogger.log('Error getting markets via Polymarket API:', error);

      // Log to Sentry - this error is swallowed (returns []) so controller won't see it
      Logger.error(
        error instanceof Error ? error : new Error(String(error)),
        this.getErrorContext('getMarkets', {
          category: params?.category,
          status: params?.status,
          sortBy: params?.sortBy,
          hasSearchQuery: !!params?.q,
        }),
      );

      return [];
    }
  }

  public async getPriceHistory({
    marketId,
    fidelity,
    interval,
  }: GetPriceHistoryParams): Promise<PredictPriceHistoryPoint[]> {
    if (!marketId) {
      throw new Error('marketId parameter is required');
    }

    try {
      const { CLOB_ENDPOINT } = getPolymarketEndpoints();
      const searchParams = new URLSearchParams({ market: marketId });

      if (typeof fidelity === 'number') {
        searchParams.set('fidelity', String(fidelity));
      }

      if (interval) {
        searchParams.set('interval', interval);
      }

      const response = await fetch(
        `${CLOB_ENDPOINT}/prices-history?${searchParams.toString()}`,
        {
          method: 'GET',
        },
      );

      if (!response.ok) {
        throw new Error('Failed to get price history');
      }

      const data = (await response.json()) as {
        history?: { t?: number; p?: number }[];
      };

      if (!Array.isArray(data?.history)) {
        return [];
      }

      return data.history
        .filter(
          (entry): entry is { t: number; p: number } =>
            typeof entry?.t === 'number' && typeof entry?.p === 'number',
        )
        .map((entry) => ({
          timestamp: entry.t,
          price: entry.p,
        }));
    } catch (error) {
      DevLogger.log('Error getting price history via Polymarket API:', error);

      // Log to Sentry - this error is swallowed (returns []) so controller won't see it
      Logger.error(
        error instanceof Error ? error : new Error(String(error)),
        this.getErrorContext('getPriceHistory', {
          marketId,
          fidelity,
          interval,
        }),
      );

      return [];
    }
  }

  private addRecentlySoldPositions({
    address,
    positionIds,
  }: {
    address: string;
    positionIds: string[];
  }) {
    // Delete anything older than 5 minutes to prevent
    // list from growing too large
    const recentlySoldPositions = (
      this.#recentlySoldPositionsByAddress.get(address) ?? []
    ).filter((soldPosition) => soldPosition.timestamp > Date.now() - 5 * 60000);

    recentlySoldPositions.push(
      ...positionIds.map((positionId) => ({
        positionId,
        timestamp: Date.now(),
      })),
    );
    this.#recentlySoldPositionsByAddress.set(address, recentlySoldPositions);
  }

  public async getPositions({
    address,
    limit = 100, // todo: reduce this once we've decided on the pagination approach
    offset = 0,
    claimable = false,
    marketId,
  }: GetPositionsParams): Promise<PredictPosition[]> {
    const { DATA_API_ENDPOINT } = getPolymarketEndpoints();

    if (!address) {
      throw new Error('Address is required');
    }

    const predictAddress = computeProxyAddress(address);

    const queryParams = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      user: predictAddress,
      sortBy: 'CURRENT',
      redeemable: claimable.toString(),
      ...(marketId && { eventId: marketId }),
    });

    const response = await fetch(
      `${DATA_API_ENDPOINT}/positions?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      throw new Error('Failed to get positions');
    }
    const positionsData = (await response.json()) as PolymarketPosition[];
    const parsedPositions = await parsePolymarketPositions({
      positions: positionsData,
    });

    // NOTE: Remove positions that were recently sold. This is a workaround for
    // Polymarket's API taking some time to update positions
    const soldPositions =
      this.#recentlySoldPositionsByAddress.get(address) ?? [];

    const filteredPositions = parsedPositions.filter((position) => {
      const isSold = soldPositions.some(
        (soldPosition) => soldPosition.positionId === position.id,
      );
      return !isSold;
    });

    return filteredPositions;
  }

  private async fetchActivity({
    address,
  }: {
    address: string;
  }): Promise<PredictActivity[]> {
    const { DATA_API_ENDPOINT } = getPolymarketEndpoints();

    if (!address) {
      throw new Error('Address is required');
    }

    try {
      const predictAddress =
        this.#accountStateByAddress.get(address)?.address ??
        (await this.getAccountState({ ownerAddress: address })).address;

      const queryParams = new URLSearchParams({
        // user: '0x33a90b4f8a9cccfe19059b0954e3f052d93efc00',
        user: predictAddress,
      });

      const response = await fetch(
        `${DATA_API_ENDPOINT}/activity?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error('Failed to get activity');
      }

      const activityRaw = (await response.json()) as PolymarketApiActivity[];
      const parsedActivity = parsePolymarketActivity(activityRaw);
      return Array.isArray(parsedActivity) ? parsedActivity : [];
    } catch (error) {
      DevLogger.log('Error getting activity via Polymarket API:', error);

      // Log to Sentry - this error is swallowed (returns []) so controller won't see it
      Logger.error(
        error instanceof Error ? error : new Error(String(error)),
        this.getErrorContext('fetchActivity'),
      );

      return [];
    }
  }

  public async getUnrealizedPnL({
    address,
  }: {
    address: string;
  }): Promise<UnrealizedPnL> {
    const { DATA_API_ENDPOINT } = getPolymarketEndpoints();

    const predictAddress =
      this.#accountStateByAddress.get(address)?.address ??
      (await this.getAccountState({ ownerAddress: address })).address;

    const response = await fetch(
      `${DATA_API_ENDPOINT}/upnl?user=${predictAddress}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      throw new Error('Failed to fetch unrealized P&L');
    }

    const data = (await response.json()) as UnrealizedPnL[];

    if (!Array.isArray(data)) {
      throw new Error('No unrealized P&L data found');
    }

    return data[0];
  }

  public async previewOrder(
    params: Omit<PreviewOrderParams, 'providerId'> & { signer?: Signer },
  ): Promise<OrderPreview> {
    const basePreview = await previewOrder(params);

    if (params.side === Side.BUY && params.signer) {
      if (this.isRateLimited(params.signer.address)) {
        return {
          ...basePreview,
          rateLimited: true,
        };
      }
    }

    return basePreview;
  }

  public async placeOrder(
    params: Omit<PlaceOrderParams, 'providerId'> & { signer: Signer },
  ): Promise<OrderResult> {
    const { signer, preview } = params;
    const {
      outcomeTokenId,
      side,
      maxAmountSpent,
      minAmountReceived,
      negRisk,
      fees,
      slippage,
      tickSize,
      positionId,
    } = preview;

    if (side === Side.BUY) {
      this.#buyOrderInProgressByAddress.set(signer.address, true);
    }

    try {
      const chainId = POLYGON_MAINNET_CHAIN_ID;

      const makerAddress =
        this.#accountStateByAddress.get(signer.address)?.address ??
        computeProxyAddress(signer.address);

      if (!makerAddress) {
        throw new Error('Maker address not found');
      }

      // Introduce slippage into minAmountReceived to reduce failure rate
      const roundConfig = ROUNDING_CONFIG[tickSize.toString() as TickSize];
      const decimals = roundConfig.amount ?? 4;
      const minAmountWithSlippage = roundOrderAmount({
        amount: minAmountReceived * (1 - slippage),
        decimals,
      });

      const makerAmount = parseUnits(maxAmountSpent.toString(), 6).toString();
      const takerAmount = parseUnits(
        minAmountWithSlippage.toString(),
        6,
      ).toString();

      /**
       * Do NOT change the order below.
       * This order needs to match the order on the relayer.
       */
      const order: OrderData & { salt: string } = {
        salt: generateSalt(),
        maker: makerAddress,
        signer: signer.address,
        taker: '0x0000000000000000000000000000000000000000',
        tokenId: outcomeTokenId,
        makerAmount,
        takerAmount,
        expiration: '0',
        nonce: '0',
        feeRateBps: '0',
        side: side === Side.BUY ? UtilsSide.BUY : UtilsSide.SELL,
        signatureType: SignatureType.POLY_GNOSIS_SAFE,
      };

      const contractConfig = getContractConfig(chainId);

      const exchangeContract = negRisk
        ? contractConfig.negRiskExchange
        : contractConfig.exchange;

      const verifyingContract = exchangeContract;

      const typedData = getOrderTypedData({
        order,
        chainId,
        verifyingContract,
      });

      const signature = await signer.signTypedMessage(
        { data: typedData, from: signer.address },
        SignTypedDataVersion.V4,
      );

      const signedOrder = {
        ...order,
        signature,
      };

      const signerApiKey = await this.getApiKey({ address: signer.address });

      const clobOrder = {
        order: { ...signedOrder, side, salt: parseInt(signedOrder.salt) },
        owner: signerApiKey.apiKey,
        orderType: OrderType.FOK,
      };

      const body = JSON.stringify(clobOrder);

      const headers = await getL2Headers({
        l2HeaderArgs: {
          method: 'POST',
          requestPath: `/order`,
          body,
        },
        address: clobOrder.order.signer ?? '',
        apiKey: signerApiKey,
      });

      let feeAuthorization;
      if (fees !== undefined && fees.totalFee > 0) {
        const safeAddress = computeProxyAddress(signer.address);
        const feeAmountInUsdc = BigInt(
          parseUnits(fees.totalFee.toString(), 6).toString(),
        );
        feeAuthorization = await createSafeFeeAuthorization({
          safeAddress,
          signer,
          amount: feeAmountInUsdc,
          to: FEE_COLLECTOR_ADDRESS,
        });
      }

      const { success, response, error } = await submitClobOrder({
        headers,
        clobOrder,
        feeAuthorization,
      });

      if (!response) {
        return {
          success,
          error,
        } as OrderResult;
      }

      if (side === Side.BUY) {
        this.#lastBuyOrderTimestampByAddress.set(signer.address, Date.now());
      } else if (positionId) {
        this.addRecentlySoldPositions({
          address: signer.address,
          positionIds: [positionId],
        });
      }

      return {
        success,
        response: {
          id: response.orderID,
          spentAmount: response.makingAmount,
          receivedAmount: response.takingAmount,
          txHashes: response.transactionsHashes,
        },
        error,
      } as OrderResult;
    } catch (error) {
      // Catch all errors and return them in consistent format
      // instead of throwing for better error handling
      DevLogger.log('PolymarketProvider: Place order failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        errorDetails: error instanceof Error ? error.stack : undefined,
        side,
        outcomeTokenId,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to place order',
      } as OrderResult;
    } finally {
      if (side === Side.BUY) {
        this.#buyOrderInProgressByAddress.set(signer.address, false);
      }
    }
  }

  public async prepareClaim(
    params: ClaimOrderParams,
  ): Promise<ClaimOrderResponse> {
    try {
      const { positions, signer } = params;

      if (!positions || positions.length === 0) {
        throw new Error('No positions provided for claim');
      }

      if (!signer?.address) {
        throw new Error('Signer address is required for claim');
      }

      // Get safe address from cache or fetch it
      let safeAddress: string | undefined;
      try {
        safeAddress = computeProxyAddress(signer.address);
      } catch (error) {
        throw new Error(
          `Failed to retrieve account state: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
      }

      if (!safeAddress) {
        throw new Error('Safe address not found for claim');
      }

      // Generate claim transaction
      let claimTransaction;
      try {
        claimTransaction = await getClaimTransaction({
          signer,
          positions,
          safeAddress,
        });
      } catch (error) {
        throw new Error(
          `Failed to generate claim transaction: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
      }

      if (!claimTransaction || claimTransaction.length === 0) {
        throw new Error('No claim transaction generated');
      }

      return {
        chainId: POLYGON_MAINNET_CHAIN_ID,
        transactions: claimTransaction,
      };
    } catch (error) {
      // Log error for debugging
      DevLogger.log('PolymarketProvider: prepareClaim failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });

      // Re-throw with clear error message
      throw error;
    }
  }

  public confirmClaim({
    positions,
    signer,
  }: {
    positions: PredictPosition[];
    signer: Signer;
  }) {
    this.addRecentlySoldPositions({
      address: signer.address,
      positionIds: positions.map((position) => position.id),
    });
  }

  public async isEligible(): Promise<boolean> {
    const { GEOBLOCK_API_ENDPOINT } = getPolymarketEndpoints();
    let eligible = false;
    try {
      const res = await fetch(GEOBLOCK_API_ENDPOINT);
      const { blocked } = (await res.json()) as { blocked: boolean };
      if (blocked !== undefined) {
        eligible = blocked === false;
      }
    } catch (error) {
      DevLogger.log('PolymarketProvider: Error checking geoblock status', {
        error:
          error instanceof Error
            ? error.message
            : `Error checking geoblock status: ${error}`,
        timestamp: new Date().toISOString(),
      });

      // Log to Sentry - this error is swallowed (returns false) so controller won't see it
      Logger.error(
        error instanceof Error ? error : new Error(String(error)),
        this.getErrorContext('isEligible', {
          operation: 'geoblock_check',
        }),
      );
    }
    return eligible;
  }

  public async prepareDeposit(
    params: PrepareDepositParams & { signer: Signer },
  ): Promise<PrepareDepositResponse> {
    const transactions = [];
    const { signer } = params;

    if (!signer?.address) {
      throw new Error('Signer address is required for deposit preparation');
    }

    const { collateral } = MATIC_CONTRACTS;

    if (!collateral) {
      throw new Error('Collateral contract address not configured');
    }

    const accountState = await this.getAccountState({
      ownerAddress: signer.address,
    });

    if (!accountState) {
      throw new Error('Failed to retrieve account state');
    }

    if (!accountState.address) {
      throw new Error('Account address not found in account state');
    }

    if (!accountState.isDeployed) {
      const deployTransaction = await getDeployProxyWalletTransaction({
        signer,
      });

      if (!deployTransaction) {
        throw new Error('Failed to get deploy proxy wallet transaction params');
      }

      if (!deployTransaction.params?.to || !deployTransaction.params?.data) {
        throw new Error('Invalid deploy transaction: missing params');
      }

      transactions.push(deployTransaction);
    }

    if (!accountState.hasAllowances) {
      const allowanceTransaction = await getProxyWalletAllowancesTransaction({
        signer,
      });

      if (!allowanceTransaction) {
        throw new Error('Failed to get proxy wallet allowances transaction');
      }

      if (
        !allowanceTransaction.params?.to ||
        !allowanceTransaction.params?.data
      ) {
        throw new Error('Invalid allowance transaction: missing params');
      }

      transactions.push(allowanceTransaction);
    }

    const depositTransactionCallData = generateTransferData('transfer', {
      toAddress: accountState.address,
      amount: '0x0',
    });

    if (!depositTransactionCallData) {
      throw new Error(
        'Failed to generate transfer data for deposit transaction',
      );
    }

    transactions.push({
      params: {
        to: collateral as Hex,
        data: depositTransactionCallData as Hex,
      },
      type: TransactionType.predictDeposit,
    });

    return {
      chainId: CHAIN_IDS.POLYGON,
      transactions,
    };
  }

  public async getAccountState(params: {
    ownerAddress: string;
  }): Promise<AccountState> {
    try {
      const { ownerAddress } = params;

      if (!ownerAddress) {
        throw new Error('Owner address is required');
      }

      // Get or compute safe address
      const cachedAddress = this.#accountStateByAddress.get(ownerAddress);
      let address: string;
      try {
        address = cachedAddress?.address ?? computeProxyAddress(ownerAddress);
      } catch (error) {
        throw new Error(
          `Failed to compute safe address: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
      }

      if (!address) {
        throw new Error('Failed to get safe address');
      }

      // Check deployment status and allowances
      let isDeployed: boolean;
      let hasAllowancesResult: boolean;
      try {
        [isDeployed, hasAllowancesResult] = await Promise.all([
          isSmartContractAddress(
            address,
            numberToHex(POLYGON_MAINNET_CHAIN_ID),
          ),
          hasAllowances({ address }),
        ]);
      } catch (error) {
        throw new Error(
          `Failed to check account state: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
      }

      const accountState = {
        address: address as `0x${string}`,
        isDeployed,
        hasAllowances: hasAllowancesResult,
      };

      this.#accountStateByAddress.set(ownerAddress, accountState);

      return accountState;
    } catch (error) {
      DevLogger.log('PolymarketProvider: getAccountState failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  public async getBalance({ address }: GetBalanceParams): Promise<number> {
    if (!address) {
      throw new Error('address is required');
    }
    const cachedAddress = this.#accountStateByAddress.get(address);
    const predictAddress =
      cachedAddress?.address ?? computeProxyAddress(address);
    const balance = await getBalance({ address: predictAddress });
    return balance;
  }

  public async prepareWithdraw(
    params: PrepareWithdrawParams & { signer: Signer },
  ): Promise<PrepareWithdrawResponse> {
    const { signer } = params;

    if (!signer.address) {
      throw new Error('Signer address is required');
    }

    const safeAddress =
      this.#accountStateByAddress.get(signer.address)?.address ??
      (await this.getAccountState({ ownerAddress: signer.address })).address;

    const callData = encodeErc20Transfer({
      to: signer.address,
      value: '0x0',
    });

    return {
      chainId: CHAIN_IDS.POLYGON,
      transaction: {
        params: {
          to: MATIC_CONTRACTS.collateral as Hex,
          data: callData as Hex,
        },
        type: TransactionType.predictWithdraw,
      },
      predictAddress: safeAddress,
    };
  }

  public async signWithdraw(
    params: SignWithdrawParams,
  ): Promise<SignWithdrawResponse> {
    const { callData, signer } = params;

    if (!signer.address) {
      throw new Error('Signer address is required');
    }

    const safeAddress =
      this.#accountStateByAddress.get(signer.address)?.address ??
      computeProxyAddress(signer.address);

    const signedCallData = await getWithdrawTransactionCallData({
      data: callData,
      signer,
      safeAddress,
    });

    const amount = getSafeUsdcAmount(callData);

    return {
      callData: signedCallData,
      amount,
    };
  }
}
