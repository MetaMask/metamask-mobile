import { BaseController } from '@metamask/base-controller';
import { Messenger } from '@metamask/messenger';

/**
 * The remote I/O the controller depends on. In a real controller this would
 * be a SDK, an HTTP client, an RPC provider, etc. The integration test mocks
 * this — the controller logic itself runs for real.
 */
export interface WidgetService {
  fetchWidget(id: string): Promise<{ id: string; label: string; price: number }>;
}

export type Widget = {
  id: string;
  label: string;
  price: number;
  /** Cents. Derived from `price` at insert time. */
  priceCents: number;
};

export type WidgetControllerState = {
  widgets: Record<string, Widget>;
  loading: boolean;
  lastSyncedAt: number | null;
};

const DEFAULT_STATE: WidgetControllerState = {
  widgets: {},
  loading: false,
  lastSyncedAt: null,
};

const METADATA = {
  widgets: { persist: true, anonymous: false },
  loading: { persist: false, anonymous: true },
  lastSyncedAt: { persist: true, anonymous: true },
};

export type WidgetControllerActions = never;
export type WidgetControllerEvents = {
  type: `WidgetController:stateChange`;
  payload: [WidgetControllerState, []];
};

export class WidgetController extends BaseController<
  'WidgetController',
  WidgetControllerState,
  Messenger<'WidgetController', WidgetControllerActions, WidgetControllerEvents, never>
> {
  #service: WidgetService;
  #now: () => number;

  constructor(opts: {
    messenger: Messenger<'WidgetController', WidgetControllerActions, WidgetControllerEvents, never>;
    service: WidgetService;
    state?: Partial<WidgetControllerState>;
    now?: () => number;
  }) {
    super({
      name: 'WidgetController',
      messenger: opts.messenger,
      metadata: METADATA,
      state: { ...DEFAULT_STATE, ...opts.state },
    });
    this.#service = opts.service;
    this.#now = opts.now ?? Date.now;
  }

  async addWidget(id: string): Promise<void> {
    this.update((draft) => {
      draft.loading = true;
    });
    try {
      const fetched = await this.#service.fetchWidget(id);
      const widget: Widget = {
        ...fetched,
        priceCents: Math.round(fetched.price * 100),
      };
      this.update((draft) => {
        draft.widgets[widget.id] = widget;
        draft.lastSyncedAt = this.#now();
        draft.loading = false;
      });
    } catch (err) {
      this.update((draft) => {
        draft.loading = false;
      });
      throw err;
    }
  }
}
