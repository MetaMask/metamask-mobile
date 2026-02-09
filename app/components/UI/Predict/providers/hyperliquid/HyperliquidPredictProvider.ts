/**
 * HyperliquidPredictProvider
 *
 * Implements the PredictProvider interface for Hyperliquid HIP-4
 * prediction markets (Event Futures). This provider enables the Predict tab
 * to display and trade HIP-4 binary outcome markets alongside Polymarket.
 *
 * Data flow:
 * spotMeta API -> HyperliquidHIP4Service -> PredictMarket/PredictPosition types
 *
 * Trading flow:
 * Buy/Sell YES/NO tokens via Hyperliquid spot exchange API
 *
 * Key differences from Polymarket:
 * - No separate wallet (uses Hyperliquid perps account / Arbitrum bridge)
 * - Spot token trading instead of CLOB
 * - Fully collateralized (1x, no leverage)
 * - Binary resolution (0 or 1)
 */

import Logger from '../../../../../util/Logger';
import { generateTransferData } from '../../../../../util/transactions';
import {
  getBridgeInfo,
  USDC_ARBITRUM_MAINNET_ADDRESS,
  USDC_ARBITRUM_TESTNET_ADDRESS,
} from '../../../Perps/constants/hyperLiquidConfig';
import {
  GetPriceHistoryParams,
  GetPriceParams,
  GetPriceResponse,
  PredictActivity,
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
  ConnectionStatus,
  GeoBlockResponse,
  GetBalanceParams,
  GetMarketsParams,
  GetPositionsParams,
  OrderPreview,
  OrderResult,
  PlaceOrderParams,
  PredictProvider,
  PrepareDepositParams,
  PrepareDepositResponse,
  PrepareWithdrawParams,
  PrepareWithdrawResponse,
  PreviewOrderParams,
  PriceUpdateCallback,
  Signer,
  SignWithdrawParams,
  SignWithdrawResponse,
} from '../types';
import {
  ARBITRUM_MAINNET_CHAIN_ID,
  ARBITRUM_TESTNET_CHAIN_ID,
  HYPERLIQUID_PROVIDER_ID,
  HYPERLIQUID_PROVIDER_NAME,
  MIN_ORDER_SIZE_USDC,
  SLIPPAGE_BUY,
  SLIPPAGE_SELL,
  TICK_SIZE,
} from './constants';
import { HyperliquidHIP4Service } from '../../../Perps/services/HyperliquidHIP4Service';
import type { HyperliquidPredictProviderConfig } from './types';

/**
 * Hyperliquid HIP-4 prediction market provider for the Predict tab.
 */
export class HyperliquidPredictProvider implements PredictProvider {
  readonly providerId = HYPERLIQUID_PROVIDER_ID;
  readonly name = HYPERLIQUID_PROVIDER_NAME;
  readonly chainId: number;

  private readonly hip4Service: HyperliquidHIP4Service;
  private readonly isTestnet: boolean;

  constructor(config?: HyperliquidPredictProviderConfig) {
    this.isTestnet = config?.isTestnet ?? false;
    this.chainId = this.isTestnet
      ? ARBITRUM_TESTNET_CHAIN_ID
      : ARBITRUM_MAINNET_CHAIN_ID;
    this.hip4Service = new HyperliquidHIP4Service({
      log: (message: string, ...args: unknown[]) => {
        Logger.log(`[HyperliquidPredict] ${message}`, ...args);
      },
    });
  }

  // ---- Market Data ----

  async getMarkets(params: GetMarketsParams): Promise<PredictMarket[]> {
    try {
      // We use a simple HTTP info client for direct API calls
      const infoClient = this.createInfoClient();
      const outcomeData =
        await this.hip4Service.fetchOutcomeMarkets(infoClient);
      const prices = await this.hip4Service.fetchPrices(infoClient);
      const markets = this.hip4Service.mapToHIP4Markets(outcomeData, prices);
      let predictMarkets = this.hip4Service.mapToPredictMarkets(markets);

      // Apply filters
      if (params.category) {
        predictMarkets = predictMarkets.filter(
          (m) => m.category === params.category,
        );
      }
      if (params.q) {
        const query = params.q.toLowerCase();
        predictMarkets = predictMarkets.filter(
          (m) =>
            m.title.toLowerCase().includes(query) ||
            m.description.toLowerCase().includes(query),
        );
      }
      if (params.status) {
        predictMarkets = predictMarkets.filter(
          (m) => m.status === params.status,
        );
      }

      // Apply sorting
      if (params.sortBy === 'volume24h') {
        predictMarkets.sort((a, b) =>
          params.sortDirection === 'asc'
            ? a.volume - b.volume
            : b.volume - a.volume,
        );
      }

      // Apply pagination
      const offset = params.offset ?? 0;
      const limit = params.limit ?? predictMarkets.length;
      return predictMarkets.slice(offset, offset + limit);
    } catch (error) {
      Logger.log('[HyperliquidPredict] getMarkets failed', error);
      return [];
    }
  }

  async getMarketsByIds(marketIds: string[]): Promise<PredictMarket[]> {
    const allMarkets = await this.getMarkets({});
    return allMarkets.filter((m) => marketIds.includes(m.id));
  }

  async getMarketDetails(params: {
    marketId: string;
    liveSportsLeagues?: string[];
  }): Promise<PredictMarket> {
    const allMarkets = await this.getMarkets({});
    const market = allMarkets.find((m) => m.id === params.marketId);
    if (!market) {
      throw new Error(`Market not found: ${params.marketId}`);
    }
    return market;
  }

  async getPriceHistory(
    _params: GetPriceHistoryParams,
  ): Promise<PredictPriceHistoryPoint[]> {
    // HIP-4 price history via candle snapshot is available but
    // needs spot token symbol mapping. Return empty for now.
    // TODO: Implement using candleSnapshot endpoint for spot tokens
    return [];
  }

  async getPrices(
    params: Omit<GetPriceParams, 'providerId'>,
  ): Promise<GetPriceResponse> {
    try {
      const infoClient = this.createInfoClient();
      const mids = await this.hip4Service.fetchPrices(infoClient);

      const results = params.queries.map((query) => {
        const tokenKey = `@${query.outcomeTokenId}`;
        const priceStr = mids[tokenKey];
        const price = priceStr ? parseFloat(priceStr) : 0;

        return {
          marketId: query.marketId,
          outcomeId: query.outcomeId,
          outcomeTokenId: query.outcomeTokenId,
          entry: {
            buy: price,
            sell: price,
          },
        };
      });

      return {
        providerId: this.providerId,
        results,
      };
    } catch (error) {
      Logger.log('[HyperliquidPredict] getPrices failed', error);
      return {
        providerId: this.providerId,
        results: [],
      };
    }
  }

  // ---- User Information ----

  async getPositions(
    _params: Omit<GetPositionsParams, 'address'> & { address: string },
  ): Promise<PredictPosition[]> {
    // TODO: Implement by querying spotClearinghouseState for user's
    // outcome token holdings and mapping to PredictPosition
    return [];
  }

  async getActivity(_params: { address: string }): Promise<PredictActivity[]> {
    // TODO: Implement by querying userFills for spot trades on outcome tokens
    return [];
  }

  async getUnrealizedPnL(_params: { address: string }): Promise<UnrealizedPnL> {
    // TODO: Calculate from spot positions vs current prices
    return {
      user: _params.address,
      cashUpnl: 0,
      percentUpnl: 0,
    };
  }

  // ---- Order Management ----

  async previewOrder(
    params: Omit<PreviewOrderParams, 'providerId'> & {
      signer: Signer;
      feeCollection?: unknown;
    },
  ): Promise<OrderPreview> {
    const infoClient = this.createInfoClient();
    const mids = await this.hip4Service.fetchPrices(infoClient);

    const tokenKey = `@${params.outcomeTokenId}`;
    const priceStr = mids[tokenKey];
    const sharePrice = priceStr ? parseFloat(priceStr) : 0;

    const slippage = params.side === Side.BUY ? SLIPPAGE_BUY : SLIPPAGE_SELL;

    // For HIP-4: buying YES at price p costs p per token
    // Buying NO at price p costs (1-p) per token
    const effectivePrice =
      params.side === Side.BUY
        ? sharePrice * (1 + slippage)
        : sharePrice * (1 - slippage);

    const maxAmountSpent =
      params.side === Side.BUY ? params.size * effectivePrice : params.size;

    const minAmountReceived =
      params.side === Side.BUY ? params.size : params.size * effectivePrice;

    return {
      marketId: params.marketId,
      outcomeId: params.outcomeId,
      outcomeTokenId: params.outcomeTokenId,
      timestamp: Date.now(),
      side: params.side,
      sharePrice,
      maxAmountSpent,
      minAmountReceived,
      slippage,
      tickSize: parseFloat(TICK_SIZE),
      minOrderSize: MIN_ORDER_SIZE_USDC,
      negRisk: false, // HIP-4 is binary, not neg-risk
    };
  }

  async placeOrder(
    _params: Omit<PlaceOrderParams, 'providerId'> & { signer: Signer },
  ): Promise<OrderResult> {
    // TODO: Implement spot order placement via Hyperliquid exchange API
    // This requires:
    // 1. Building a spot order for the YES/NO token
    // 2. Signing with EIP-712 via the signer
    // 3. Submitting via exchange endpoint
    return {
      success: false,
      error:
        'HIP-4 order placement not yet implemented. Testnet exploration in progress.',
    };
  }

  // ---- Claim Management ----

  async prepareClaim(_params: ClaimOrderParams): Promise<ClaimOrderResponse> {
    // HIP-4 positions auto-settle on resolution.
    // No manual claim needed - funds return to Hyperliquid balance.
    return {
      chainId: this.chainId,
      transactions: [],
    };
  }

  confirmClaim?(_params: {
    positions: PredictPosition[];
    signer: Signer;
  }): void {
    // No-op: HIP-4 auto-settles
  }

  // ---- Eligibility ----

  async isEligible(): Promise<GeoBlockResponse> {
    // Reuse the same geo-blocking as Perps since they share the Hyperliquid platform
    // TODO: Integrate with PerpsController's eligibility check
    return {
      isEligible: true,
    };
  }

  // ---- Wallet Management ----

  async prepareDeposit(
    _params: PrepareDepositParams & { signer: Signer },
  ): Promise<PrepareDepositResponse> {
    // HIP-4 shares the same Hyperliquid account as Perps.
    // Deposits go through the Arbitrum bridge contract - same as Perps deposits.
    // This builds an ERC-20 transfer to the bridge contract on Arbitrum.
    const bridgeInfo = getBridgeInfo(this.isTestnet);
    const usdcAddress = this.isTestnet
      ? USDC_ARBITRUM_TESTNET_ADDRESS
      : USDC_ARBITRUM_MAINNET_ADDRESS;

    const chainIdHex = `0x${this.chainId.toString(16)}` as `0x${string}`;

    // Generate ERC-20 transfer data to the Hyperliquid bridge contract.
    // Amount is set to 0x0 here as a placeholder - the actual amount is configured
    // by the deposit flow UI before the transaction is submitted.
    const transferData = generateTransferData('transfer', {
      toAddress: bridgeInfo.contractAddress,
      amount: '0x0',
    });

    return {
      chainId: chainIdHex,
      transactions: [
        {
          params: {
            to: usdcAddress as `0x${string}`,
            data: transferData as `0x${string}`,
          },
        },
      ],
    };
  }

  async getAccountState(_params: {
    providerId: string;
    ownerAddress: string;
  }): Promise<AccountState> {
    // Hyperliquid accounts are always "deployed" (no smart contract wallet needed)
    return {
      address: _params.ownerAddress as `0x${string}`,
      isDeployed: true,
      hasAllowances: true,
    };
  }

  async prepareWithdraw(
    _params: PrepareWithdrawParams & { signer: Signer },
  ): Promise<PrepareWithdrawResponse> {
    // TODO: Implement withdrawal via Hyperliquid's withdraw3 endpoint
    return {
      chainId: `0x${this.chainId.toString(16)}` as `0x${string}`,
      transaction: {
        params: {
          to: '0x0000000000000000000000000000000000000000' as `0x${string}`,
          data: '0x' as `0x${string}`,
        },
      },
      predictAddress:
        '0x0000000000000000000000000000000000000000' as `0x${string}`,
    };
  }

  async signWithdraw?(
    _params: SignWithdrawParams,
  ): Promise<SignWithdrawResponse> {
    return {
      callData: '0x' as `0x${string}`,
      amount: 0,
    };
  }

  async getBalance(params: GetBalanceParams): Promise<number> {
    if (!params.address) {
      return 0;
    }
    try {
      const baseUrl = this.isTestnet
        ? 'https://api.hyperliquid-testnet.xyz'
        : 'https://api.hyperliquid.xyz';

      const response = await fetch(`${baseUrl}/info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'clearinghouseState',
          user: params.address,
        }),
      });

      if (!response.ok) {
        Logger.log(
          `[HyperliquidPredict] clearinghouseState failed: ${response.status}`,
        );
        return 0;
      }

      const data = await response.json();
      // withdrawable = total balance minus margin used across all positions
      const withdrawable = parseFloat(data?.withdrawable ?? '0');
      return isNaN(withdrawable) ? 0 : withdrawable;
    } catch (error) {
      Logger.log('[HyperliquidPredict] getBalance failed', error);
      return 0;
    }
  }

  // ---- Subscriptions ----

  subscribeToGameUpdates?(_gameId: string, _callback: unknown): () => void {
    // HIP-4 doesn't have sports game updates
    return () => undefined;
  }

  subscribeToMarketPrices?(
    _tokenIds: string[],
    _callback: PriceUpdateCallback,
  ): () => void {
    // TODO: Implement WebSocket subscription for spot token prices
    // Use allMids subscription filtered to outcome token symbols
    return () => undefined;
  }

  getConnectionStatus?(): ConnectionStatus {
    return {
      sportsConnected: false,
      marketConnected: false, // TODO: Track WebSocket state
    };
  }

  // ---- Private Helpers ----

  /**
   * Creates a minimal info client for direct HTTP API calls.
   * This avoids coupling to the Perps WebSocket infrastructure.
   */
  private createInfoClient() {
    const baseUrl = this.isTestnet
      ? 'https://api.hyperliquid-testnet.xyz'
      : 'https://api.hyperliquid.xyz';

    return {
      spotMeta: async () => {
        const response = await fetch(`${baseUrl}/info`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'spotMeta' }),
        });
        if (!response.ok) {
          throw new Error(`spotMeta request failed: ${response.status}`);
        }
        return response.json();
      },
      allMids: async () => {
        const response = await fetch(`${baseUrl}/info`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'allMids' }),
        });
        if (!response.ok) {
          throw new Error(`allMids request failed: ${response.status}`);
        }
        return response.json();
      },
    };
  }
}
