import { Observable } from '../../session/Observable';
import type { OrderPreview, OrderReceipt } from '../../types';
import { PredictError, PredictErrorCode } from '../../types/errors';
import type { PredictSessionService } from '../../session/PredictSessionService';
import type { PortfolioService } from '../portfolio/PortfolioService';
import type { PredictAnalytics } from '../analytics/predictAnalytics';

/**
 * Order state machine for the POC: IDLE → PREVIEWING → READY → PLACING → SUCCESS|ERROR.
 *
 * - No auto-deposit chaining; deposit must be done explicitly first.
 * - A balance check before submit returns INSUFFICIENT_FUNDS.
 * - Sell side is identical to buy from the state-machine perspective; the only
 *   difference is the preview semantics (size = shares for sell).
 */
export type OrderStatus = 'idle' | 'previewing' | 'ready' | 'placing' | 'success' | 'error';

export interface TradingState {
  status: OrderStatus;
  preview?: OrderPreview;
  receipt?: OrderReceipt;
  error?: { code: PredictErrorCode; message: string };
}

const INITIAL: TradingState = { status: 'idle' };

export interface PreviewArgs {
  ownerAddress: string;
  eventId: string;
  marketId: string;
  outcomeId: string;
  side: 'buy' | 'sell';
  size: string;
  positionId?: string;
}

export class TradingService extends Observable<TradingState> {
  constructor(
    private readonly sessionService: PredictSessionService,
    private readonly portfolio: PortfolioService,
    private readonly analytics: PredictAnalytics,
  ) {
    super(INITIAL);
  }

  reset(): void {
    this.setState(INITIAL);
  }

  async preview(args: PreviewArgs): Promise<OrderPreview | undefined> {
    this.setState({ status: 'previewing' });
    try {
      const client = await this.sessionService.getClient(args.ownerAddress);
      const preview = await client.getOrderPreview({
        eventId: args.eventId,
        marketId: args.marketId,
        outcomeId: args.outcomeId,
        side: args.side,
        size: args.size,
        positionId: args.positionId,
      });
      this.setState({ status: 'ready', preview });
      this.analytics.track({ name: 'predict_preview', props: { side: args.side } });
      return preview;
    } catch (err) {
      this.setError(err);
      return undefined;
    }
  }

  async submit(args: { ownerAddress: string; slippageBps?: number }): Promise<OrderReceipt | undefined> {
    const { preview } = this.getState();
    if (!preview) {
      this.setError(new PredictError(PredictErrorCode.INVALID_PARAMETERS, 'no preview'));
      return undefined;
    }
    // POC: balance check before submit. Only `buy` consumes balance.
    if (preview.side === 'buy') {
      const balance = this.portfolio.getState().balance;
      const cost = Number(preview.maxAmountSpent);
      const available = Number(balance?.amount ?? '0');
      if (available < cost) {
        this.setError(
          new PredictError(
            PredictErrorCode.INSUFFICIENT_FUNDS,
            `Need ${cost.toFixed(2)} USDC, have ${available.toFixed(2)}`,
          ),
        );
        return undefined;
      }
    }

    this.setState((prev) => ({ ...prev, status: 'placing' }));
    try {
      const client = await this.sessionService.getClient(args.ownerAddress);
      const receipt = await client.submitOrder({ preview, slippageBps: args.slippageBps });
      this.setState((prev) => ({ ...prev, status: 'success', receipt }));
      // Optimistic portfolio patch + balance refresh.
      this.portfolio.refresh(args.ownerAddress).catch(() => undefined);
      this.analytics.track({
        name: 'predict_order_filled',
        props: { side: preview.side, receivedAmount: receipt.receivedAmount },
      });
      return receipt;
    } catch (err) {
      this.setError(err);
      return undefined;
    }
  }

  private setError(err: unknown): void {
    const code = err instanceof PredictError ? err.code : PredictErrorCode.UNKNOWN_ERROR;
    const message = err instanceof Error ? err.message : 'unknown error';
    this.setState((prev) => ({ ...prev, status: 'error', error: { code, message } }));
  }
}
