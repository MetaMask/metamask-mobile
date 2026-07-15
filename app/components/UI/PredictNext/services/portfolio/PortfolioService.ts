import { Observable } from '../../session/Observable';
import type { ActivityItem, PredictBalance, PredictPosition } from '../../types';
import type { PredictSessionService } from '../../session/PredictSessionService';
import type { PredictAnalytics } from '../analytics/predictAnalytics';

/**
 * POC portfolio cache. Holds balance, positions, and activity. Optimistic
 * cache patches (the read-model writer interface) are inlined here as
 * methods — full PredictNext design uses a structural interface.
 */
export interface PortfolioState {
  balance?: PredictBalance;
  positions: PredictPosition[];
  activity: ActivityItem[];
  loading: boolean;
  error?: string;
}

const INITIAL: PortfolioState = { positions: [], activity: [], loading: false };

export class PortfolioService extends Observable<PortfolioState> {
  constructor(
    private readonly sessionService: PredictSessionService,
    private readonly analytics: PredictAnalytics,
  ) {
    super(INITIAL);
  }

  async refresh(ownerAddress: string): Promise<void> {
    this.setState((prev) => ({ ...prev, loading: true, error: undefined }));
    try {
      const client = await this.sessionService.getClient(ownerAddress);
      const [balance, positions, activity] = await Promise.all([
        client.fetchBalance(),
        client.fetchPositions({}),
        client.fetchActivity({}),
      ]);
      this.setState({
        balance,
        positions,
        activity: activity.items,
        loading: false,
      });
      this.analytics.track({
        name: 'predict_portfolio_refresh',
        props: {
          positions: positions.length,
          activity: activity.items.length,
          balance: balance.amount,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown';
      this.setState((prev) => ({ ...prev, loading: false, error: message }));
    }
  }

  onOrderSubmitted(position: PredictPosition): void {
    // Optimistic patch: insert at the head and flag as optimistic.
    this.setState((prev) => ({
      ...prev,
      positions: [
        { ...position, optimistic: true },
        ...prev.positions.filter((p) => p.id !== position.id),
      ],
    }));
  }

  onOrderConfirmed(positionId: string): void {
    this.setState((prev) => ({
      ...prev,
      positions: prev.positions.map((p) =>
        p.id === positionId ? { ...p, optimistic: false } : p,
      ),
    }));
  }

  onOrderFailed(positionId: string): void {
    this.setState((prev) => ({
      ...prev,
      positions: prev.positions.filter((p) => p.id !== positionId),
    }));
  }
}
