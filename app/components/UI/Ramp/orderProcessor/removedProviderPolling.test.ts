import nock from 'nock';
import { OrderStatusEnum } from '@consensys/on-ramp-sdk';
import { OrderOrderTypeEnum } from '@consensys/on-ramp-sdk/dist/API';
import { HttpError } from '@metamask/controller-utils';
import {
  RampsOrderStatus,
  type RampsController,
} from '@metamask/ramps-controller';
import { FIAT_ORDER_STATES } from '../../../../constants/on-ramp';
import Logger from '../../../../util/Logger';
import { MAX_ERROR_COUNT as V1_MAX_ERROR_COUNT } from '../Aggregator/orderProcessor/aggregator';
import { MAX_ERROR_COUNT as V2_MAX_ERROR_COUNT } from './unifiedOrderProcessor';
import {
  DAY_MS,
  ORDER_POLL_INTERVAL_MS,
  backoffScheduleMs,
  processOrderAt,
  simulateOrderPolling,
  type ProviderRemovedFiatOrder,
} from '../testUtils/simulateOrderPolling';
import {
  PROVIDER_REMOVED_DESCRIPTION,
  START_MS,
  WALLET,
  buildAggregatorOrder,
  buildRampsOrder,
  buildStoredOrder,
  expectStoredOrderKept,
  v1PlainUnknownBody,
  v1ProviderRemovedBody,
  v2PlainUnknownStub,
  v2ProviderRemovedStub,
  type CanBeUpdated,
} from '../testUtils/removedProviderFixtures';

// TRAM-3417: pending orders from providers the on-ramp API removed
// (unlimitmeld, blockchaindotcom). Both polling paths are affected:
// - V1 (aggregator): the real on-ramp SDK, HTTP faked only at the API with nock.
// - V2 (unified): RampsController.getOrder stubbed on the Engine mock, as in
//   unifiedOrderProcessor.test.ts. The /v2/ route calls the same
//   GetOrderService.getOrder as V1, so #1408's UNKNOWN stub reaches it too
//   (design L18-22, L50, L202-216, L234-236).
// A "fetch" is one HTTP request (V1) or one getOrder call (V2).

const mockGetOrder = jest.fn<
  ReturnType<RampsController['getOrder']>,
  Parameters<RampsController['getOrder']>
>();

jest.mock('../../../../core/Engine', () => ({
  context: {
    RampsController: {
      getOrder: (...args: Parameters<RampsController['getOrder']>) =>
        mockGetOrder(...args),
    },
  },
}));

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), log: jest.fn() },
}));

// The SDK picks Production or Staging from the app environment.
const ON_RAMP_ORDERS_API = /on-ramp\.(uat-)?api\.cx\.metamask\.io/;

type Answer =
  | 'http500'
  | 'plainUnknown'
  | 'completesOnThirdFetch'
  | 'pendingWithProviderRemovedReason'
  | { providerRemoved: CanBeUpdated };
const PROVIDER_REMOVED: Answer = { providerRemoved: false };
// statusReason without status UNKNOWN (an order still PENDING).
const providerRemovedReason = {
  statusReason: 'PROVIDER_REMOVED',
  statusDescription: PROVIDER_REMOVED_DESCRIPTION,
};

/** One order on one polling path, with its fake API. */
interface PollingPath {
  stored: ProviderRemovedFiatOrder;
  maxErrorCount: number;
  /** Answers every fetch of the order with `answer`. */
  answer: (answer: Answer) => void;
  fetches: () => number;
  /** Every fetch asked for this order and wallet. */
  expectEveryFetchTargetsTheOrder: () => void;
}

let unmatchedRequests = 0;
const countUnmatched = () => {
  unmatchedRequests += 1;
};

const v1 = (
  providerCode: string,
  orderCode: string,
  orderType: OrderOrderTypeEnum = OrderOrderTypeEnum.Buy,
): PollingPath => {
  const data = buildAggregatorOrder(providerCode, orderCode, orderType);
  let requests = 0;
  return {
    stored: buildStoredOrder(data),
    maxErrorCount: V1_MAX_ERROR_COUNT,
    answer: (answer) => {
      nock(ON_RAMP_ORDERS_API)
        .persist()
        .get(data.id)
        .query((query) => query.wallet === WALLET)
        .reply(() => {
          requests += 1;
          if (answer === 'http500') {
            // A Nest 500. The SDK throws on any non-2xx, so the body is not read.
            return [500, { statusCode: 500, message: 'Internal server error' }];
          }
          if (answer === 'plainUnknown') return [200, v1PlainUnknownBody(data)];
          if (answer === 'completesOnThirdFetch') {
            const done = requests >= 3;
            return [
              200,
              {
                ...data,
                status: done
                  ? OrderStatusEnum.Completed
                  : OrderStatusEnum.Pending,
                txHash: done ? '0xabc123' : '',
              },
            ];
          }
          if (answer === 'pendingWithProviderRemovedReason') {
            return [200, { ...data, ...providerRemovedReason }];
          }
          return [200, v1ProviderRemovedBody(data, answer.providerRemoved)];
        });
    },
    // Requests nock doesn't match count too, so a wrong mock ends the run at
    // the fetch limit instead of polling silently; afterEach then fails.
    fetches: () => requests + unmatchedRequests,
    expectEveryFetchTargetsTheOrder: () => expect(unmatchedRequests).toBe(0),
  };
};

const v2 = (providerCode: string, orderCode: string): PollingPath => {
  const data = buildRampsOrder(providerCode, orderCode);
  return {
    stored: buildStoredOrder(data),
    maxErrorCount: V2_MAX_ERROR_COUNT,
    answer: (answer) => {
      if (answer === 'http500') {
        // What RampsService.getOrder throws for a non-2xx answer.
        mockGetOrder.mockRejectedValue(
          new HttpError(
            500,
            `Fetching 'https://on-ramp.api.cx.metamask.io/v2/providers/${providerCode}/orders/${orderCode}' failed with status '500'`,
          ),
        );
      } else if (answer === 'plainUnknown') {
        mockGetOrder.mockResolvedValue(v2PlainUnknownStub(data));
      } else if (answer === 'completesOnThirdFetch') {
        mockGetOrder.mockImplementation(async () =>
          mockGetOrder.mock.calls.length >= 3
            ? {
                ...data,
                status: RampsOrderStatus.Completed,
                txHash: '0xabc123',
              }
            : { ...data, status: RampsOrderStatus.Pending },
        );
      } else if (answer === 'pendingWithProviderRemovedReason') {
        mockGetOrder.mockResolvedValue({ ...data, ...providerRemovedReason });
      } else {
        mockGetOrder.mockResolvedValue(
          v2ProviderRemovedStub(data, answer.providerRemoved),
        );
      }
    },
    fetches: () => mockGetOrder.mock.calls.length,
    expectEveryFetchTargetsTheOrder: () => {
      expect(mockGetOrder).toHaveBeenCalled();
      for (const call of mockGetOrder.mock.calls) {
        expect(call).toEqual([providerCode, orderCode, WALLET]);
      }
    },
  };
};

const pollFor = (
  path: PollingPath,
  horizonMs: number,
  order = path.stored,
  fetchLimit?: number,
) => simulateOrderPolling(order, horizonMs, path.fetches, fetchLimit);

const removedPaths: [string, () => PollingPath][] = [
  ['V1 aggregator', () => v1('unlimitmeld', 'meld-7f3a')],
  ['V2 unified', () => v2('blockchaindotcom', 'bc-91e0')],
];

describe('Order polling for removed and live providers, V1 and V2 (TRAM-3417)', () => {
  beforeAll(() => {
    nock.disableNetConnect();
    nock.emitter.on('no match', countUnmatched);
  });

  afterEach(() => {
    expect(unmatchedRequests).toBe(0);
    unmatchedRequests = 0;
    nock.cleanAll();
    mockGetOrder.mockReset();
    jest.mocked(Logger.error).mockClear();
  });

  afterAll(() => {
    nock.emitter.removeListener('no match', countUnmatched);
    nock.enableNetConnect();
  });

  describe('a removed provider whose fetch fails with HTTP 500 every time', () => {
    // Consecutive HTTP 500s back off (100 s, 1,000 s, 10,000 s, 100,000 s) and
    // stop after MAX_ERROR_COUNT, counted in `fetchErrorCount`. A successful
    // reply clears it. `errorCount` keeps its own backoff.
    it.each(removedPaths)(
      '%s: backs off, then stops after MAX_ERROR_COUNT consecutive 500s (fetchErrorCount)',
      async (_path, makePath) => {
        const path = makePath();
        path.answer('http500');

        const run = await pollFor(path, 30 * DAY_MS);

        expect(run.fetchedAtMs).toEqual(backoffScheduleMs(path.maxErrorCount));
        expect(run.order).toMatchObject({
          state: FIAT_ORDER_STATES.PENDING,
          fetchErrorCount: path.maxErrorCount,
        });
        path.expectEveryFetchTargetsTheOrder();
      },
    );

    // Any reply, here a plain UNKNOWN, clears fetchErrorCount. errorCount still
    // moves with the existing UNKNOWN backoff.
    it.each(removedPaths)(
      '%s: clears fetchErrorCount on any reply and keeps errorCount as today',
      async (_path, makePath) => {
        const path = makePath();
        path.answer('plainUnknown');
        const failing = {
          ...path.stored,
          fetchErrorCount: path.maxErrorCount - 1,
        };

        const order = await processOrderAt(failing, START_MS);

        expect(path.fetches()).toBe(1);
        expect(order).toMatchObject({ errorCount: 1, fetchErrorCount: 0 });
      },
    );
  });

  describe('a listed removed provider that answers UNKNOWN + PROVIDER_REMOVED', () => {
    // UNKNOWN plus statusReason PROVIDER_REMOVED is final (design L255),
    // whatever canBeUpdated says. V1 sell polls use getSellOrder and get the
    // same body (design L218-232).
    it.each([
      ['V1 aggregator buy', false, () => v1('unlimitmeld', 'o-1')],
      [
        'V1 aggregator sell',
        false,
        () => v1('blockchaindotcom', 's-1', OrderOrderTypeEnum.Sell),
      ],
      ['V2 unified buy', false, () => v2('blockchaindotcom', 'o-2')],
      ['V1 aggregator buy', true, () => v1('unlimitmeld', 'o-1')],
      ['V1 aggregator buy', 'missing', () => v1('unlimitmeld', 'o-1')],
      ['V2 unified buy', true, () => v2('blockchaindotcom', 'o-2')],
      ['V2 unified buy', 'missing', () => v2('blockchaindotcom', 'o-2')],
    ] as [string, CanBeUpdated, () => PollingPath][])(
      '%s, canBeUpdated %s: stops after the first answer, sets providerRemoved and stores statusDescription',
      async (_path, canBeUpdated, makePath) => {
        const path = makePath();
        path.answer({ providerRemoved: canBeUpdated });

        const run = await pollFor(path, 30 * DAY_MS);

        expect(run.fetchedAtMs).toEqual([0]);
        expectStoredOrderKept(run.order, path.stored);
        path.expectEveryFetchTargetsTheOrder();
        expect(Logger.error).not.toHaveBeenCalled();
      },
    );

    // A forced refresh that receives UNKNOWN plus PROVIDER_REMOVED fetches
    // once, then the order is final: stored data and state kept, forceUpdate
    // cleared, and it is not polled again.
    it.each(removedPaths)(
      '%s: a forced refresh of an unflagged order that gets PROVIDER_REMOVED fetches once, marks it final, then never polls again',
      async (_path, makePath) => {
        const path = makePath();
        path.answer(PROVIDER_REMOVED);
        const stored = { ...path.stored, forceUpdate: true };

        const refreshed = await processOrderAt(stored, START_MS + DAY_MS, {
          forced: true,
        });
        expect(path.fetches()).toBe(1);
        expectStoredOrderKept(refreshed, stored);

        const run = await pollFor(path, 30 * DAY_MS, refreshed);
        expect(run.fetchedAtMs).toEqual([]);
        expect(path.fetches()).toBe(1);
        expectStoredOrderKept(run.order, stored);
        path.expectEveryFetchTargetsTheOrder();
      },
    );

    // An order already flagged providerRemoved is final: a forced refresh makes
    // no request and returns it unchanged.
    it.each(removedPaths)(
      '%s: a forced refresh of an order already flagged providerRemoved makes no request and keeps it unchanged',
      async (_path, makePath) => {
        const path = makePath();
        path.answer(PROVIDER_REMOVED);
        const flagged: ProviderRemovedFiatOrder = {
          ...path.stored,
          providerRemoved: true,
          statusDescription: PROVIDER_REMOVED_DESCRIPTION,
          forceUpdate: false,
        };

        const refreshed = await processOrderAt(flagged, START_MS + DAY_MS, {
          forced: true,
        });
        const run = await pollFor(path, 30 * DAY_MS, refreshed);

        expect(refreshed).toEqual(flagged);
        expect(run).toMatchObject({ fetchedAtMs: [], order: flagged });
        expect(path.fetches()).toBe(0);
      },
    );

    // Final means status UNKNOWN plus statusReason PROVIDER_REMOVED only (Tech
    // Lead decision, Nov 1): with any other status, here PENDING, the order is
    // not flagged and polls as normal.
    it.each(removedPaths)(
      '%s: does not treat statusReason PROVIDER_REMOVED with status PENDING as removed and polls every 10 seconds',
      async (_path, makePath) => {
        const path = makePath();
        path.answer('pendingWithProviderRemovedReason');

        const run = await pollFor(path, DAY_MS, path.stored, 3);

        expect(run.fetchedAtMs).toEqual(
          [0, 1, 2].map((n) => n * ORDER_POLL_INTERVAL_MS),
        );
        expect(run.order.state).toBe(FIAT_ORDER_STATES.PENDING);
        expect(run.order.providerRemoved).toBeUndefined();
        expect(run.order.statusDescription).toBeUndefined();
        path.expectEveryFetchTargetsTheOrder();
      },
    );
  });

  // A provider the API can't resolve that is not on the removed list (for
  // example one that failed initialize(), design L44, L94, L234-235) is
  // transient: these orders may still complete, so polling goes on with
  // today's timing, exactly. V1 (aggregator.ts:115-124, no cap): 0, 100 s,
  // 1,100 s, 11,100 s, 111,100 s, 1,111,100 s; any cap adds a 7th fetch inside
  // 30 days and a stop removes the 6th. V2 (unifiedOrderProcessor.ts:125-131,
  // errorCount capped at MAX_ERROR_COUNT) adds 2,111,100 s; a lower cap adds
  // fetches, no cap or a stop removes it.
  it.each([
    ['V1 aggregator', 'uncapped', 6, Infinity, () => v1('koywe', 'o-1')],
    [
      'V2 unified',
      'capped at MAX_ERROR_COUNT',
      7,
      V2_MAX_ERROR_COUNT,
      () => v2('koywe', 'o-2'),
    ],
  ] as [string, string, number, number, () => PollingPath][])(
    "%s: a plain UNKNOWN (no statusReason) keeps the order pending with its data and today's %s backoff over 30 days",
    async (_path, _label, fetchCount, cap, makePath) => {
      const path = makePath();
      path.answer('plainUnknown');
      const schedule = backoffScheduleMs(fetchCount, cap);

      const run = await pollFor(path, 30 * DAY_MS);

      expect(run.fetchedAtMs).toEqual(schedule);
      expect(run.endedBecause).toBe('horizon');
      // The UNKNOWN body (V2: with a string provider) never replaces the stored
      // details, so every poll still targets the same provider and order.
      const { fetchErrorCount, ...order } = run.order;
      expect(order).toEqual({
        ...path.stored,
        errorCount: Math.min(fetchCount, cap),
        lastTimeFetched: START_MS + schedule[fetchCount - 1],
      });
      // Every reply sets fetchErrorCount to 0.
      expect(fetchErrorCount ?? 0).toBe(0);
      path.expectEveryFetchTargetsTheOrder();
      expect(Logger.error).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['V1 aggregator', () => v1('transak', 'tx-55d1')],
    ['V2 unified', () => v2('transak', 'abc-123')],
  ])(
    '%s: a live provider is polled every 10 seconds until the order completes',
    async (_path, makePath) => {
      const path = makePath();
      path.answer('completesOnThirdFetch');

      const run = await pollFor(path, DAY_MS);

      expect(run.fetchedAtMs).toEqual(
        [0, 1, 2].map((n) => n * ORDER_POLL_INTERVAL_MS),
      );
      expect(run.endedBecause).toBe('order_left_pending');
      expect(run.order).toMatchObject({
        state: FIAT_ORDER_STATES.COMPLETED,
        txHash: '0xabc123',
        errorCount: 0,
      });
      path.expectEveryFetchTargetsTheOrder();
      expect(Logger.error).not.toHaveBeenCalled();
    },
  );
});
