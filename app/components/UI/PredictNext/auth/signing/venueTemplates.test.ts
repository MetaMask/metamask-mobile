import fixture from '../../contracts/v1/fixtures/venue-signing-v2.json';
import {
  renderStep,
  TemplateError,
  type TemplateInputs,
  type TemplateProfile,
  type TemplateValues,
} from './venueTemplates';

const kalshi = fixture.profile as unknown as TemplateProfile;
const NOW = 1_700_000_000_000;

describe('renderStep against the shared fixture', () => {
  it.each(fixture.cases)('renders $name', (row) => {
    const rendered = renderStep(kalshi, row.operation, row.step, {
      inputs: row.inputs as TemplateInputs,
      values: row.values as TemplateValues,
      nowMs: row.nowMs,
    });

    expect(
      rendered.map(({ name, class: kind, method, path, query, body }) => ({
        name,
        class: kind,
        method,
        path,
        query,
        body,
      })),
    ).toEqual(
      row.requests.map(({ name, class: kind, method, path, query, body }) => ({
        name,
        class: kind,
        method,
        path,
        query,
        body,
      })),
    );
    expect(rendered.map((request) => request.idempotencyKey)).toEqual(
      row.requests.map((request) =>
        'idempotencyKey' in request ? request.idempotencyKey : undefined,
      ),
    );
  });

  it.each(fixture.refusals)('refuses: $name', (row) => {
    let thrown: unknown;
    try {
      renderStep(kalshi, row.operation, row.step, {
        inputs: row.inputs as TemplateInputs,
        values: row.values as TemplateValues,
        nowMs: NOW,
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(TemplateError);
    expect((thrown as TemplateError).rule).toBe(row.rule);
  });
});

/** A synthetic profile that uses every source, shape and path feature. */
const synthetic: TemplateProfile = {
  operations: {
    'orders.commit': {
      class: 'mutation',
      steps: {
        submit: [{ request: 'create' }],
        lookup: [{ request: 'order' }],
        scan: [{ request: 'scan' }],
      },
    },
    'orders.sell': {
      class: 'mutation',
      steps: {
        default: [
          { request: 'create', when: { input: 'action', equals: 'buy' } },
          { request: 'deposit', when: { input: 'action', equals: 'sell' } },
        ],
      },
    },
    'portfolio.read': {
      class: 'read',
      steps: { default: [{ request: 'create' }] },
    },
  },
  requests: {
    create: {
      class: 'mutation',
      method: 'POST',
      path: '/trade-api/v2/portfolio/events/orders',
      idempotencyKey: { input: 'idempotencyKey' },
      body: {
        json: [
          { key: 'ticker', value: { input: 'marketId' } },
          { key: 'client_order_id', value: { input: 'idempotencyKey' } },
          {
            key: 'side',
            value: {
              map: {
                inputs: ['action', 'outcome'],
                table: {
                  'buy:yes': 'bid',
                  'buy:no': 'ask',
                  'sell:yes': 'ask',
                  'sell:no': 'bid',
                },
              },
            },
          },
          {
            key: 'count',
            value: {
              value: 'count',
              shape: { kind: 'decimal', scale: 2, min: '1' },
            },
          },
          {
            key: 'price',
            value: {
              value: 'price',
              shape: { kind: 'decimal', scale: 4, min: '0.01', max: '0.99' },
            },
          },
          { key: 'time_in_force', value: { const: 'immediate_or_cancel' } },
          { key: 'post_only', value: { const: false } },
        ],
        maxBytes: 400,
      },
    },
    order: {
      class: 'read',
      method: 'GET',
      path: '/trade-api/v2/portfolio/orders/{order_id}',
      pathParams: {
        order_id: { value: 'order_id', shape: { kind: 'uuid-v4' } },
      },
    },
    scan: {
      class: 'read',
      method: 'GET',
      path: '/trade-api/v2/portfolio/orders',
      query: [
        { key: 'ticker', value: { input: 'marketId' } },
        {
          key: 'min_ts',
          value: {
            value: 'min_ts',
            shape: { kind: 'time', unit: 's', maxAgeSec: 600, maxAheadSec: 60 },
          },
        },
        {
          key: 'cursor',
          value: { value: 'cursor', shape: { kind: 'opaque', maxLength: 16 } },
          optional: true,
        },
        { key: 'limit', value: { const: 200 } },
      ],
    },
    deposit: {
      class: 'mutation',
      method: 'POST',
      path: '/trade-api/v2/isv/deposit/crypto-addresses',
      idempotencyKey: { input: 'idempotencyKey' },
      body: {
        json: [
          {
            key: 'amount_cents',
            value: {
              input: 'amountCents',
              shape: { kind: 'int', min: 100, max: 1_000_000 },
            },
          },
          {
            key: 'networks',
            value: {
              input: 'networks',
              shape: {
                kind: 'array',
                of: { kind: 'oneOf', values: ['base', 'ethereum'] },
                maxItems: 2,
              },
            },
          },
        ],
        maxBytes: 128,
      },
    },
  },
};

const KEY = 'a1b2c3d4-1111-4222-8333-444455556666';
const ORDER = '0a1b2c3d-1111-4222-8333-444455556666';
const order = {
  action: 'buy',
  outcome: 'yes',
  marketId: 'M',
  idempotencyKey: KEY,
};
const render = (
  operation: string,
  step: string,
  inputs: TemplateInputs,
  values: TemplateValues = {},
  profile: TemplateProfile = synthetic,
) => renderStep(profile, operation, step, { inputs, values, nowMs: NOW });

const ruleOf = (run: () => unknown): string | undefined => {
  try {
    run();
  } catch (error) {
    return error instanceof TemplateError ? error.rule : 'other';
  }
  return undefined;
};

describe('renderStep sources', () => {
  it('renders const, input, map and value sources in template order, with typed JSON', () => {
    const [created] = render('orders.commit', 'submit', order, {
      count: '1.00',
      price: '0.5000',
    });

    expect(created?.body).toBe(
      '{"ticker":"M","client_order_id":"a1b2c3d4-1111-4222-8333-444455556666","side":"bid","count":"1.00","price":"0.5000","time_in_force":"immediate_or_cancel","post_only":false}',
    );
    expect(created?.idempotencyKey).toBe(KEY);
  });

  it('maps both legs through the table', () => {
    const side = (action: string, outcome: string) =>
      JSON.parse(
        render(
          'orders.commit',
          'submit',
          { ...order, action, outcome },
          { count: '1.00', price: '0.5000' },
        )[0]?.body ?? '{}',
      ).side;

    expect(side('buy', 'yes')).toBe('bid');
    expect(side('buy', 'no')).toBe('ask');
    expect(side('sell', 'yes')).toBe('ask');
    expect(side('sell', 'no')).toBe('bid');
    expect(
      ruleOf(() =>
        render(
          'orders.commit',
          'submit',
          { ...order, outcome: 'maybe' },
          { count: '1.00', price: '0.5000' },
        ),
      ),
    ).toBe('map');
  });

  it('fills path parameters percent-encoded and shape-checks them', () => {
    const [read] = render('orders.commit', 'lookup', {}, { order_id: ORDER });

    expect(read?.path).toBe(`/trade-api/v2/portfolio/orders/${ORDER}`);
    expect(
      ruleOf(() =>
        render(
          'orders.commit',
          'lookup',
          {},
          { order_id: '../../withdrawals' },
        ),
      ),
    ).toBe('shape');
    expect(ruleOf(() => render('orders.commit', 'lookup', {}, {}))).toBe(
      'value',
    );
  });

  it('renders query keys in order, leaves an absent optional key out and encodes values', () => {
    const minTs = NOW / 1000 - 30;
    const [scan] = render(
      'orders.commit',
      'scan',
      { marketId: 'A B&C' },
      { min_ts: minTs },
    );

    expect(scan?.query).toBe(`ticker=A%20B%26C&min_ts=${minTs}&limit=200`);
    expect(
      render(
        'orders.commit',
        'scan',
        { marketId: 'M' },
        { min_ts: minTs, cursor: 'abc' },
      )[0]?.query,
    ).toBe(`ticker=M&min_ts=${minTs}&cursor=abc&limit=200`);
  });

  it('does not leave an optional key out when its value is refused', () => {
    expect(
      ruleOf(() =>
        render(
          'orders.commit',
          'scan',
          { marketId: 'M' },
          { min_ts: NOW / 1000, cursor: 'x'.repeat(17) },
        ),
      ),
    ).toBe('shape');
  });

  it('renders the step selected by a condition', () => {
    expect(
      render('orders.sell', 'default', order, {
        count: '1.00',
        price: '0.5000',
      }).map((request) => request.name),
    ).toEqual(['create']);
    expect(
      render('orders.sell', 'default', {
        ...order,
        action: 'sell',
        amountCents: 500,
        networks: ['base'],
      }).map((request) => request.name),
    ).toEqual(['deposit']);
  });
});

describe('renderStep shapes', () => {
  const create = (values: TemplateValues) =>
    ruleOf(() => render('orders.commit', 'submit', order, values));

  it('bounds decimals by scale and range', () => {
    expect(create({ count: '1.00', price: '0.5000' })).toBeUndefined();
    expect(create({ count: '1.00', price: '0.0099' })).toBe('shape');
    expect(create({ count: '1.00', price: '1.0000' })).toBe('shape');
    expect(create({ count: '1.00', price: '0.50001' })).toBe('shape');
    expect(create({ count: '0.99', price: '0.5000' })).toBe('shape');
    expect(create({ count: 1, price: '0.5000' })).toBe('shape');
    expect(create({ count: '1e2', price: '0.5000' })).toBe('shape');
  });

  it('bounds times around the phone clock', () => {
    const scan = (minTs: number) =>
      ruleOf(() =>
        render('orders.commit', 'scan', { marketId: 'M' }, { min_ts: minTs }),
      );

    expect(scan(NOW / 1000 - 600)).toBeUndefined();
    expect(scan(NOW / 1000 - 601)).toBe('shape');
    expect(scan(NOW / 1000 + 61)).toBe('shape');
    expect(scan(NOW / 1000 + 0.5)).toBe('shape');
  });

  it('bounds arrays, integers and enumerations, and keeps their JSON types', () => {
    const deposit = (amountCents: unknown, networks: unknown) =>
      ruleOf(() =>
        render('orders.sell', 'default', {
          ...order,
          action: 'sell',
          amountCents,
          networks,
        } as TemplateInputs),
      );

    expect(deposit(500, ['base', 'ethereum'])).toBeUndefined();
    expect(deposit(500, ['base', 'ethereum', 'base'])).toBe('shape');
    expect(deposit(500, ['solana'])).toBe('shape');
    expect(deposit(99, ['base'])).toBe('shape');
    expect(deposit(1_000_001, ['base'])).toBe('shape');
    expect(deposit(500.5, ['base'])).toBe('shape');
    expect(deposit('500', ['base'])).toBe('shape');
    expect(
      render('orders.sell', 'default', {
        ...order,
        action: 'sell',
        amountCents: 500,
        networks: ['base'],
      })[0]?.body,
    ).toBe('{"amount_cents":500,"networks":["base"]}');
  });
});

describe('renderStep refusals', () => {
  it('refuses a mutation without an idempotency key', () => {
    const profile: TemplateProfile = {
      ...synthetic,
      requests: {
        ...synthetic.requests,
        create: {
          ...(synthetic.requests.create as object),
          idempotencyKey: undefined,
        } as never,
      },
    };

    expect(
      ruleOf(() =>
        render(
          'orders.commit',
          'submit',
          order,
          { count: '1.00', price: '0.5000' },
          profile,
        ),
      ),
    ).toBe('idempotency_key');
  });

  it('refuses a read operation that renders a mutation', () => {
    expect(
      ruleOf(() =>
        render('portfolio.read', 'default', order, {
          count: '1.00',
          price: '0.5000',
        }),
      ),
    ).toBe('class');
  });

  it('refuses a body over its byte limit', () => {
    expect(
      ruleOf(() =>
        render(
          'orders.commit',
          'submit',
          { ...order, marketId: 'M'.repeat(400) },
          { count: '1.00', price: '0.5000' },
        ),
      ),
    ).toBe('max_bytes');
  });

  it('refuses a template that names an invariant no implementation provides', () => {
    const profile: TemplateProfile = {
      ...synthetic,
      requests: {
        ...synthetic.requests,
        create: {
          ...(synthetic.requests.create as object),
          invariants: [{ implementation: 'binary-limit-order-v1' }],
        } as never,
      },
    };

    expect(
      ruleOf(() =>
        render(
          'orders.commit',
          'submit',
          order,
          { count: '1.00', price: '0.5000' },
          profile,
        ),
      ),
    ).toBe('invariant');
  });

  it('does not treat inherited properties as operations, steps or inputs', () => {
    expect(ruleOf(() => render('constructor', 'default', {}))).toBe(
      'operation',
    );
    expect(ruleOf(() => render('orders.commit', 'toString', {}))).toBe('step');
    expect(
      ruleOf(() =>
        render('orders.commit', 'submit', {}, { count: '1.00', price: '0.5' }),
      ),
    ).toBe('input');
  });

  it('transforms a decimal input to its fixed form', () => {
    const profile: TemplateProfile = {
      operations: {
        op: { class: 'read', steps: { default: [{ request: 'r' }] } },
      },
      requests: {
        r: {
          class: 'read',
          method: 'GET',
          path: '/p',
          query: [
            {
              key: 'count',
              value: { input: 'count', transform: 'decimal-fixed-2' },
            },
          ],
        },
      },
    };

    expect(render('op', 'default', { count: '3' }, {}, profile)[0]?.query).toBe(
      'count=3.00',
    );
    expect(
      render('op', 'default', { count: '3.5' }, {}, profile)[0]?.query,
    ).toBe('count=3.50');
    expect(
      ruleOf(() => render('op', 'default', { count: '3.555' }, {}, profile)),
    ).toBe('transform');
  });
});

describe('renderStep generic refusals', () => {
  /** One read whose path segment and query value come straight from inputs. */
  const passthrough: TemplateProfile = {
    operations: {
      op: { class: 'read', steps: { default: [{ request: 'r' }] } },
    },
    requests: {
      r: {
        class: 'read',
        method: 'GET',
        path: '/items/{id}',
        pathParams: { id: { input: 'id' } },
        query: [{ key: 'q', value: { input: 'q' } }],
      },
    },
  };
  const read = (inputs: TemplateInputs) =>
    ruleOf(() => render('op', 'default', inputs, {}, passthrough));

  it('refuses dot segments and an empty path parameter', () => {
    expect(read({ id: 'abc', q: 'x' })).toBeUndefined();
    expect(read({ id: '.', q: 'x' })).toBe('path');
    expect(read({ id: '..', q: 'x' })).toBe('path');
    expect(read({ id: '', q: 'x' })).toBe('path');
  });

  it('refuses a lone surrogate as a template error', () => {
    expect(read({ id: '\uD800', q: 'x' })).toBe('path');
    expect(read({ id: 'abc', q: '\uDFFF' })).toBe('query');
  });

  it('refuses a decimal shape with a malformed bound instead of skipping it', () => {
    const profile: TemplateProfile = {
      ...synthetic,
      requests: {
        ...synthetic.requests,
        create: {
          ...(synthetic.requests.create as object),
          body: {
            json: [
              {
                key: 'price',
                value: {
                  value: 'price',
                  shape: { kind: 'decimal', scale: 4, max: 'not-a-number' },
                },
              },
            ],
            maxBytes: 400,
          },
        } as never,
      },
    };

    expect(
      ruleOf(() =>
        render(
          'orders.commit',
          'submit',
          order,
          { count: '1.00', price: '0.5000' },
          profile,
        ),
      ),
    ).toBe('shape');
  });

  it('reports a misshaped idempotency key as an idempotency key refusal', () => {
    const profile: TemplateProfile = {
      ...synthetic,
      requests: {
        ...synthetic.requests,
        create: {
          ...(synthetic.requests.create as object),
          idempotencyKey: {
            input: 'idempotencyKey',
            shape: { kind: 'uuid-v4' },
          },
        } as never,
      },
    };

    expect(
      ruleOf(() =>
        render(
          'orders.commit',
          'submit',
          { ...order, idempotencyKey: 'not-a-uuid' },
          { count: '1.00', price: '0.5000' },
          profile,
        ),
      ),
    ).toBe('idempotency_key');
  });

  it('does not let a body key reach the object prototype', () => {
    const profile: TemplateProfile = {
      operations: {
        op: { class: 'mutation', steps: { default: [{ request: 'w' }] } },
      },
      requests: {
        w: {
          class: 'mutation',
          method: 'POST',
          path: '/w',
          idempotencyKey: { input: 'idempotencyKey' },
          body: {
            json: [{ key: '__proto__', value: { const: 'x' } }],
            maxBytes: 64,
          },
        },
      },
    };

    expect(
      render('op', 'default', { idempotencyKey: KEY }, {}, profile)[0]?.body,
    ).toBe('{"__proto__":"x"}');
  });
});

describe('binary-limit-order-v1 display', () => {
  const kalshiSell = (price: string, count: string, contracts: string) =>
    renderStep(kalshi, 'orders.commit', 'submit', {
      inputs: {
        action: 'sell',
        outcome: 'yes',
        marketId: 'MKT',
        idempotencyKey: KEY,
        contracts,
      },
      values: { price, count },
      nowMs: NOW,
    }).find((request) => request.display)?.display;

  it('takes the fee ceiling off the minimum sell proceeds', () => {
    // 6 contracts at 40¢, less the 2¢ fee ceiling: 6 × 38¢.
    expect(kalshiSell('0.4000', '6.00', '6')).toEqual({
      maxCost: '2.52',
      contracts: '6.00',
      payout: '6.00',
      minProceeds: '2.28',
    });
  });

  it('floors the minimum sell proceeds at zero when the fee exceeds the price', () => {
    expect(kalshiSell('0.0100', '6.00', '6')?.minProceeds).toBe('0.00');
  });
});
