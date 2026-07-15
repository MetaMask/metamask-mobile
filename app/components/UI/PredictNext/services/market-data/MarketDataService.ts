import { Observable } from '../../session/Observable';
import type { PredictEvent, PaginatedResult } from '../../types';
import type { PredictSessionService } from '../../session/PredictSessionService';
import type { PredictAnalytics } from '../analytics/predictAnalytics';

/**
 * POC market-data service. The canonical design extends BaseDataService and
 * owns cache-aware reads through shared query descriptors; the POC uses a
 * simple Observable cache keyed by event id with no TTLs.
 */
export interface MarketDataState {
  events: PredictEvent[];
  cursor?: string | null;
  loading: boolean;
  error?: string;
  eventById: Record<string, PredictEvent>;
}

const INITIAL: MarketDataState = { events: [], loading: false, eventById: {} };

export class MarketDataService extends Observable<MarketDataState> {
  constructor(
    private readonly sessionService: PredictSessionService,
    private readonly analytics: PredictAnalytics,
  ) {
    super(INITIAL);
  }

  async loadEvents(ownerAddress: string): Promise<void> {
    this.setState((prev) => ({ ...prev, loading: true, error: undefined }));
    try {
      const client = await this.sessionService.getClient(ownerAddress);
      const page: PaginatedResult<PredictEvent> = await client.fetchEvents({
        status: 'open',
        limit: 25,
      });
      this.setState((prev) => ({
        ...prev,
        loading: false,
        events: page.items,
        cursor: page.cursor,
        eventById: page.items.reduce<Record<string, PredictEvent>>((acc, e) => {
          acc[e.id] = e;
          return acc;
        }, {}),
      }));
      this.analytics.track({ name: 'predict_events_loaded', props: { count: page.items.length } });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown';
      this.setState((prev) => ({ ...prev, loading: false, error: message }));
    }
  }

  async loadEvent(ownerAddress: string, eventId: string): Promise<PredictEvent | undefined> {
    try {
      const client = await this.sessionService.getClient(ownerAddress);
      const event = await client.fetchEvent(eventId);
      this.setState((prev) => ({
        ...prev,
        eventById: { ...prev.eventById, [event.id]: event },
      }));
      return event;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown';
      this.setState((prev) => ({ ...prev, error: message }));
      return undefined;
    }
  }
}
