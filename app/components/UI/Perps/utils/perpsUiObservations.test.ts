import type { OrderParams, OrderResult } from '@metamask/perps-controller';
import {
  PerpsUiObservationStore,
  perpsUiInputDigest,
  beginPerpsUiSubmission,
  readPerpsUiObservations,
  type PerpsUiScaleForm,
  type PerpsUiScope,
} from './perpsUiObservations';
import { PERPS_UI_OBSERVATION_LIMIT } from '../constants/perpsConfig';

const scope: PerpsUiScope = {
  account: '0x1111111111111111111111111111111111111111',
  provider: 'lighter',
  network: 'testnet',
  market: 'ETH',
};
const request = (): OrderParams => ({
  symbol: 'ETH',
  providerId: 'lighter',
  isBuy: true,
  size: '0.01',
  orderType: 'scale',
  leverage: 1,
  scaleMinPrice: '1900',
  scaleMaxPrice: '1950',
  scaleNumOrders: 2,
  expectedScaleLadder: {
    prices: ['1900', '1950'],
    sizes: ['0.005', '0.005'],
    totalSize: '0.01',
    totalNotional: '19.25',
    minimumBaseSize: '0.001',
    minimumQuoteAmount: '1',
    sizeDecimals: 3,
  },
});

it('returns no captured data or writes when development observation is disabled', () => {
  const savedDev = __DEV__;
  try {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    beginPerpsUiSubmission(scope, request());
    expect(readPerpsUiObservations().submissions.length).toBeGreaterThan(0);

    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    expect(beginPerpsUiSubmission(scope, request())).toBeUndefined();
    expect(readPerpsUiObservations()).toEqual({
      version: 1,
      enabled: false,
      sessionId: '',
      submissionSequence: 0,
      evictedSubmissionThrough: 0,
      droppedSettlements: 0,
      captureFailures: 0,
      submissions: [],
      scaleForms: [],
    });
  } finally {
    (globalThis as { __DEV__?: boolean }).__DEV__ = savedDev;
  }
});
const form = (): Omit<PerpsUiScaleForm, 'inputDigest'> => ({
  formId: 'form-1',
  mounted: true,
  scope,
  input: {
    minPrice: '1900',
    maxPrice: '1950',
    count: '2',
    skew: '1',
    usdAmount: '20',
    isBuy: true,
    reduceOnly: false,
    leverage: 1,
  },
  previewGeneration: 'preview-1',
  previewSequence: 1,
  loading: false,
  stale: false,
  source: 'venue',
  displayedLeverage: 1,
  preview: { status: 'ready', providerId: 'lighter', prices: ['1900', '1950'] },
  ladder: [
    { price: '1900', size: '0.005' },
    { price: '1950', size: '0.005' },
  ],
});

describe('Perps UI observation ownership', () => {
  let store: PerpsUiObservationStore;
  beforeEach(() => {
    store = new PerpsUiObservationStore('session-one');
  });

  it.each(['scale', 'chase', 'twap'] as const)(
    'records %s dispatch before any result',
    (type) => {
      const params = { ...request(), orderType: type };

      const id = store.begin(scope, params);

      expect(store.read().submissions).toEqual([
        expect.objectContaining({
          requestId: id,
          sequence: 1,
          scope,
          request: params,
          state: 'pending',
          requestDigest: perpsUiInputDigest(params),
        }),
      ]);
      expect(store.read().submissions[0].result).toBeUndefined();
    },
  );

  it('retains the original scope and copied ladder after callers mutate', () => {
    const issuing = { ...scope };
    const params = request();
    store.begin(issuing, params);

    issuing.account = 'foreign';
    issuing.network = 'mainnet';
    issuing.provider = 'hyperliquid';
    (params.expectedScaleLadder?.prices as string[]).splice(0, 1, 'changed');

    expect(store.read().submissions[0].scope).toEqual(scope);
    expect(
      store.read().submissions[0].request.expectedScaleLadder?.prices,
    ).toEqual(['1900', '1950']);
  });

  it('settles overlapping requests by exact ID in reverse order', () => {
    const first = store.begin(scope, request());
    const second = store.begin({ ...scope, network: 'mainnet' }, request());

    store.settle(second, {
      success: false,
      orderId: 'partial-2',
      acceptedSize: '0.005',
      acceptedChildren: [{ state: 'filled', orderId: 'child-2' }],
    });
    store.settle(first, { success: true, orderId: 'owned-1' });

    expect(
      store.read().submissions.map((record) => record.result?.orderId),
    ).toEqual(['owned-1', 'partial-2']);
    expect(store.read().submissions[1].result?.success).toBe(false);
    expect(store.read().submissions[1].result?.acceptedChildren).toEqual([
      { state: 'filled', orderId: 'child-2' },
    ]);
  });

  it.each<OrderResult>([
    { success: false, error: 'refused' },
    {
      success: false,
      orderId: 'partial',
      acceptedSize: '0.005',
      childOrderIds: ['child'],
      partialState: { leverageUpdated: 1 },
    },
    { orderId: 'unknown', acceptedChildren: [{ state: 'waitingForFill' }] },
  ])('preserves the exact public returned result %j', (result) => {
    const id = store.begin(scope, request());

    store.settle(id, result);

    expect(store.read().submissions[0].result).toEqual(result);
    expect(store.read().submissions[0].state).toBe('settled');
  });

  it('keeps lost results pending and missing settlements unknown', () => {
    const lost = store.begin(scope, request());
    const thrown = store.begin(scope, request());

    store.settle(thrown);

    expect(
      store.read().submissions.find((record) => record.requestId === lost)
        ?.state,
    ).toBe('pending');
    expect(
      store.read().submissions.find((record) => record.requestId === thrown)
        ?.state,
    ).toBe('unknown');
    expect(store.read().submissions[1].result).toBeUndefined();
  });

  it('returns detached request and result copies without resetting the boundary', () => {
    const id = store.begin(scope, request());
    const result: OrderResult = {
      success: true,
      orderId: 'owned',
      childOrderIds: ['child'],
    };
    store.settle(id, result);
    const before = store.read();

    result.childOrderIds?.push('foreign');
    before.submissions[0].request.symbol = 'foreign';
    before.submissions[0].result?.childOrderIds?.push('foreign');
    before.submissions.splice(0);
    const after = store.read();

    expect(after.submissionSequence).toBe(1);
    expect(after.submissions[0].request.symbol).toBe('ETH');
    expect(after.submissions[0].result?.childOrderIds).toEqual(['child']);
  });

  it('evicts old pending requests and reports their late settlement gap', () => {
    const first = store.begin(scope, request());
    for (let i = 0; i < PERPS_UI_OBSERVATION_LIMIT; i++)
      store.begin(scope, request());

    store.settle(first, { success: true, orderId: 'late' });

    expect(store.read().submissions).toHaveLength(PERPS_UI_OBSERVATION_LIMIT);
    expect(store.read().evictedSubmissionThrough).toBe(1);
    expect(store.read().droppedSettlements).toBe(1);
    expect(
      store.read().submissions.some((record) => record.requestId === first),
    ).toBe(false);
  });

  it('uses a distinct restart session even when sequence numbers repeat', () => {
    const first = store.begin(scope, request());
    const restarted = new PerpsUiObservationStore('session-two');

    const second = restarted.begin(scope, request());

    expect(second).not.toBe(first);
    expect(restarted.read().sessionId).not.toBe(store.read().sessionId);
  });

  it('reports capture failures without invoking a throwing context twice', () => {
    const getScope = jest.fn(() => {
      throw new Error('context unavailable');
    });

    expect(store.begin(getScope, request())).toBeUndefined();

    expect(getScope).toHaveBeenCalledTimes(1);
    expect(store.read().captureFailures).toBe(1);
    expect(store.read().submissionSequence).toBe(1);
    expect(store.read().submissions).toEqual([]);
  });

  it('drops untyped secret and signed fields from public requests and results', () => {
    const params = Object.assign(request(), {
      authToken: 'secret',
      signedPayload: 'signed',
      trackingData: { marginUsed: 20 },
    });
    const result = {
      success: true,
      orderId: 'owned',
      authToken: 'secret',
      signedPayload: 'signed',
    };
    const id = store.begin(scope, params);

    store.settle(id, result);

    expect(JSON.stringify(store.read())).not.toMatch(
      /secret|signed|trackingData/,
    );
    expect(store.read().submissions[0].result).toEqual({
      success: true,
      orderId: 'owned',
    });
  });

  it('keeps old positive quotes explicitly stale during refresh and after route exit', () => {
    store.form(form());
    const before = store.read().scaleForms[0];

    store.form({ ...form(), loading: true, stale: true, previewSequence: 2 });
    const pending = store.read().scaleForms[0];
    store.unmount('form-1');
    const departed = store.read().scaleForms[0];

    expect(before.displayedLeverage).toBe(1);
    expect(pending.ladder).toEqual(before.ladder);
    expect(pending.stale).toBe(true);
    expect(pending.loading).toBe(true);
    expect(departed.mounted).toBe(false);
    expect(departed.stale).toBe(true);
  });

  it('changes the input digest with context, direction, leverage or edited bounds', () => {
    store.form(form());
    const first = store.read().scaleForms[0].inputDigest;
    const input = form();

    store.form({ ...input, scope: { ...scope, network: 'mainnet' } });
    const foreign = store.read().scaleForms[0].inputDigest;
    store.form({
      ...input,
      input: { ...input.input, maxPrice: '2000', isBuy: false, leverage: 2 },
    });
    const edited = store.read().scaleForms[0].inputDigest;

    expect(foreign).not.toBe(first);
    expect(edited).not.toBe(first);
    expect(perpsUiInputDigest({ b: 2, a: 1 })).toBe(
      perpsUiInputDigest({ a: 1, b: 2 }),
    );
  });

  it('bounds form lifetimes and isolates their public preview copies', () => {
    const original = form();
    store.form(original);
    const read = store.read();

    read.scaleForms[0].ladder?.push({ price: 'foreign', size: '1' });
    for (let i = 0; i < PERPS_UI_OBSERVATION_LIMIT; i++)
      store.form({ ...form(), formId: 'form-' + (i + 2) });

    expect(store.read().scaleForms).toHaveLength(PERPS_UI_OBSERVATION_LIMIT);
    expect(
      store.read().scaleForms.some((record) => record.formId === 'form-1'),
    ).toBe(false);
    expect(store.read().scaleForms[0].ladder).toHaveLength(2);
  });
});
