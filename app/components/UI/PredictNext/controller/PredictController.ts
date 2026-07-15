import { BackendClient } from '../api/backendClient';
import { KalshiAdapter } from '../adapters/kalshi/KalshiAdapter';
import { PredictSessionService } from '../session/PredictSessionService';
import { FundingExecutor } from '../services/transactions/FundingExecutor';
import { noopAnalytics, type PredictAnalytics } from '../services/analytics/predictAnalytics';
import { MarketDataService } from '../services/market-data/MarketDataService';
import { PortfolioService } from '../services/portfolio/PortfolioService';
import { TradingService } from '../services/trading/TradingService';
import { TransactionService } from '../services/transactions/TransactionService';
import { DEFAULT_BACKEND_BASE_URL } from '../constants/venueConfig';

/**
 * POC composition root. Wires the service graph from one place — the dev-menu
 * entry view holds a single PredictController and tears it down on unmount.
 * No global Engine.context registration on purpose (decision 8 in
 * `docs/kalshi-poc-plan.md`).
 */
export interface PredictControllerOptions {
  backendBaseUrl?: string;
  ownerAddress?: string;
  analytics?: PredictAnalytics;
}

export class PredictController {
  private readonly _backendClient: BackendClient;
  private readonly _session: PredictSessionService;
  private readonly _marketData: MarketDataService;
  private readonly _portfolio: PortfolioService;
  private readonly _trading: TradingService;
  private readonly _transactions: TransactionService;
  private readonly _analytics: PredictAnalytics;
  private destroyed = false;

  constructor(options: PredictControllerOptions = {}) {
    this._backendClient = new BackendClient({
      baseUrl: options.backendBaseUrl ?? DEFAULT_BACKEND_BASE_URL,
      externalUserId: options.ownerAddress,
    });
    const adapter = new KalshiAdapter(this._backendClient);
    this._session = new PredictSessionService(this._backendClient, adapter);
    this._analytics = options.analytics ?? noopAnalytics;

    const fundingExecutor = new FundingExecutor(async () => {
      const owner = options.ownerAddress;
      if (!owner) {
        throw new Error('PredictController: ownerAddress required to execute funding');
      }
      return this._session.getClient(owner);
    });

    this._marketData = new MarketDataService(this._session, this._analytics);
    this._portfolio = new PortfolioService(this._session, this._analytics);
    this._trading = new TradingService(
      this._session,
      this._portfolio,
      this._analytics,
    );
    this._transactions = new TransactionService(
      this._session,
      this._portfolio,
      fundingExecutor,
      this._analytics,
    );
  }

  get session(): PredictSessionService {
    return this._session;
  }
  get marketData(): MarketDataService {
    return this._marketData;
  }
  get portfolio(): PortfolioService {
    return this._portfolio;
  }
  get trading(): TradingService {
    return this._trading;
  }
  get transactions(): TransactionService {
    return this._transactions;
  }
  get backendClient(): BackendClient {
    return this._backendClient;
  }

  setOwnerAddress(ownerAddress: string): void {
    this._backendClient.setExternalUserId(ownerAddress);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    // Observable subscribers stay in scope only through React hooks; nothing
    // to clean up explicitly for the POC.
  }
}
