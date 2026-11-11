import {
  renderRequest,
  TemplateError,
  type RequestTemplate,
  type Scalar,
  type Shape,
  type Transform,
} from './profileTemplates';
import {
  loadVenueProfile,
  type BodyField,
  type HttpRfc9421Payload,
  type SigningProfile,
} from '../venueSigningProfiles';

// The bundled trading profile document; `loadVenueProfile` verifies it.
let profile: SigningProfile;

beforeAll(async () => {
  profile = (await loadVenueProfile()) as SigningProfile;
});

const NOW = 1_700_000_000_000;

/** The bundled mutation payloads all carry a body; the document type allows
 * a bodyless GET, so narrow once here instead of at every field. */
const payloadBody = (
  payload: HttpRfc9421Payload,
): { readonly json: readonly BodyField[]; readonly maxBytes: number } => {
  if (!payload.body) {
    throw new Error(`${payload.path} carries no body`);
  }
  return payload.body;
};

/** The create_order template, as the renderer receives it. */
const createOrder = (): RequestTemplate => {
  const payload = profile.payloads.create_order;
  if (payload.kind !== 'http-rfc9421') {
    throw new Error('unexpected payload kind');
  }
  return {
    class: 'mutation',
    method: payload.method,
    path: payload.path,
    body: {
      json: payloadBody(payload).json,
      maxBytes: payloadBody(payload).maxBytes,
    },
    idempotencyKey: payload.idempotencyKey,
    invariants: payload.invariants,
  };
};

/** The wallet_register template, as the renderer receives it. */
const walletRegister = (): RequestTemplate => {
  const payload = profile.payloads.wallet_register;
  if (payload.kind !== 'http-rfc9421') {
    throw new Error('unexpected payload kind');
  }
  return {
    class: 'mutation',
    method: payload.method,
    path: payload.path,
    body: {
      json: payloadBody(payload).json,
      maxBytes: payloadBody(payload).maxBytes,
    },
    idempotencyKey: payload.idempotencyKey,
  };
};

const orderValues = {
  price: '0.4500',
  count: '10.00',
};

describe('renderRequest for order.place', () => {
  it('renders the create_order body with values and inputs resolved', () => {
    const rendered = renderRequest('create_order', createOrder(), {
      inputs: {
        action: 'buy',
        outcome: 'yes',
        marketId: 'MKT-XYZ',
        idempotencyKey: 'a1b2c3d4-1111-4222-8333-444455556666',
        amountCents: 470,
      },
      values: orderValues,
      nowMs: NOW,
    });

    expect(rendered.name).toBe('create_order');
    expect(rendered.class).toBe('mutation');
    expect(rendered.method).toBe('POST');
    expect(rendered.path).toBe('/trade-api/v2/portfolio/events/orders');
    expect(rendered.query).toBe('');
    expect(rendered.idempotencyKey).toBe(
      'a1b2c3d4-1111-4222-8333-444455556666',
    );
    expect(JSON.parse(rendered.body)).toStrictEqual({
      ticker: 'MKT-XYZ',
      client_order_id: 'a1b2c3d4-1111-4222-8333-444455556666',
      side: 'bid',
      count: '10.00',
      price: '0.4500',
      time_in_force: 'immediate_or_cancel',
      self_trade_prevention_type: 'taker_at_cross',
    });
  });

  it('maps the sell legs through the side table', () => {
    const rendered = renderRequest('create_order', createOrder(), {
      inputs: {
        action: 'sell',
        outcome: 'no',
        marketId: 'MKT-XYZ',
        idempotencyKey: 'a1b2c3d4-1111-4222-8333-444455556666',
        contracts: '10.00',
      },
      values: orderValues,
      nowMs: NOW,
    });

    expect(JSON.parse(rendered.body).side).toBe('bid');
  });

  it('derives the venue display figures from the invariant', () => {
    const rendered = renderRequest('create_order', createOrder(), {
      inputs: {
        action: 'buy',
        outcome: 'yes',
        marketId: 'MKT-XYZ',
        idempotencyKey: 'a1b2c3d4-1111-4222-8333-444455556666',
        amountCents: 470,
      },
      values: orderValues,
      nowMs: NOW,
    });

    // 10 contracts at a 45-cent limit with a 2-cent fee ceiling: worst cost
    // is 10 x 47 cents = 4.70; worst proceeds (for the mirrored sell) are
    // 10 x 43 cents = 4.30.
    expect(rendered.display).toStrictEqual({
      maxCost: '4.70',
      contracts: '10.00',
      payout: '10.00',
      minProceeds: '4.30',
    });
  });

  it('refuses an idempotency key that is not a UUID v4', () => {
    expect(() =>
      renderRequest('create_order', createOrder(), {
        inputs: {
          action: 'buy',
          outcome: 'yes',
          marketId: 'MKT-XYZ',
          idempotencyKey: 'not-a-uuid',
          amountCents: 470,
        },
        values: orderValues,
        nowMs: NOW,
      }),
    ).toThrow(TemplateError);
  });

  it('refuses a price outside the profile bounds', () => {
    expect(() =>
      renderRequest('create_order', createOrder(), {
        inputs: {
          action: 'buy',
          outcome: 'yes',
          marketId: 'MKT-XYZ',
          idempotencyKey: 'a1b2c3d4-1111-4222-8333-444455556666',
          amountCents: 470,
        },
        values: { price: '1.0000', count: '10.00' },
        nowMs: NOW,
      }),
    ).toThrow(TemplateError);
  });

  it('refuses a sell whose contracts do not match the count', () => {
    expect(() =>
      renderRequest('create_order', createOrder(), {
        inputs: {
          action: 'sell',
          outcome: 'yes',
          marketId: 'MKT-XYZ',
          idempotencyKey: 'a1b2c3d4-1111-4222-8333-444455556666',
          contracts: '7.00',
        },
        values: orderValues,
        nowMs: NOW,
      }),
    ).toThrow(TemplateError);
  });

  it('refuses a body over the payload byte limit', () => {
    const longTicker = 'M'.repeat(300);
    expect(() =>
      renderRequest('create_order', createOrder(), {
        inputs: {
          action: 'buy',
          outcome: 'yes',
          marketId: longTicker,
          idempotencyKey: 'a1b2c3d4-1111-4222-8333-444455556666',
          amountCents: 470,
        },
        values: orderValues,
        nowMs: NOW,
      }),
    ).toThrow(TemplateError);
  });
});

describe('renderRequest for account.activate', () => {
  it('renders the wallet_register body', () => {
    const rendered = renderRequest('wallet_register', walletRegister(), {
      inputs: {
        walletAddress: '0xabc',
        network: 'eip155:1',
        idempotencyKey: 'a1b2c3d4-1111-4222-8333-444455556666',
      },
      values: {},
      nowMs: NOW,
    });

    expect(rendered.path).toBe('/trade-api/v2/isv/wallet/register');
    expect(JSON.parse(rendered.body)).toStrictEqual({
      wallet_address: '0xabc',
      network: 'eip155:1',
    });
    expect(rendered.idempotencyKey).toBe(
      'a1b2c3d4-1111-4222-8333-444455556666',
    );
  });

  it('refuses an over-long wallet address', () => {
    expect(() =>
      renderRequest('wallet_register', walletRegister(), {
        inputs: {
          walletAddress: 'W'.repeat(200),
          network: 'eip155:1',
          idempotencyKey: 'a1b2c3d4-1111-4222-8333-444455556666',
        },
        values: {},
        nowMs: NOW,
      }),
    ).toThrow(TemplateError);
  });
});

describe('renderRequest refusals that are independent of the profile', () => {
  it('refuses a read template that is not GET', () => {
    expect(() =>
      renderRequest(
        'read',
        {
          class: 'read',
          method: 'POST',
          path: '/x',
          body: { json: [], maxBytes: 10 },
        },
        { inputs: {}, values: {}, nowMs: NOW },
      ),
    ).toThrow(TemplateError);
  });

  it('refuses a mutation without an idempotency key', () => {
    expect(() =>
      renderRequest(
        'mutation',
        {
          class: 'mutation',
          method: 'POST',
          path: '/x',
          body: { json: [{ key: 'a', value: { const: 'b' } }], maxBytes: 10 },
        },
        { inputs: {}, values: {}, nowMs: NOW },
      ),
    ).toThrow(TemplateError);
  });

  it('renders a __proto__ body key inertly (null-prototype object)', () => {
    const rendered = renderRequest(
      'mutation',
      {
        class: 'mutation',
        method: 'POST',
        path: '/x',
        body: {
          json: [{ key: '__proto__', value: { const: 'inert' } }],
          maxBytes: 1024,
        },
        idempotencyKey: { const: 'a1b2c3d4-1111-4222-8333-444455556666' },
      },
      { inputs: {}, values: {}, nowMs: NOW },
    );
    // The body carries the literal key as bytes; the renderer's
    // null-prototype object means building it never touches Object.prototype.
    expect(rendered.body).toBe('{"__proto__":"inert"}');
  });
});

/** A mutation that differs from the base only where a test names it, so each
 * refusal below is attributable to one rule. */
const mutation = (over: Partial<RequestTemplate> = {}): RequestTemplate => ({
  class: 'mutation',
  method: 'POST',
  path: '/x',
  body: { json: [{ key: 'a', value: { const: 'b' } }], maxBytes: 1024 },
  idempotencyKey: { const: 'a1b2c3d4-1111-4222-8333-444455556666' },
  ...over,
});

const templateRule = (run: () => unknown): string | undefined => {
  try {
    run();
  } catch (error) {
    return error instanceof TemplateError ? error.rule : 'not-a-template-error';
  }
  return undefined;
};

describe('renderRequest envelope rules', () => {
  it('refuses a read that carries a body', () => {
    expect(
      templateRule(() =>
        renderRequest(
          'read',
          { class: 'read', method: 'GET', path: '/x', body: 'empty' },
          { inputs: {}, values: {}, nowMs: NOW },
        ),
      ),
    ).toBe('template');
  });

  it('refuses a read that carries an idempotency key', () => {
    expect(
      templateRule(() =>
        renderRequest(
          'read',
          {
            class: 'read',
            method: 'GET',
            path: '/x',
            idempotencyKey: { const: 'a1b2c3d4-1111-4222-8333-444455556666' },
          },
          { inputs: {}, values: {}, nowMs: NOW },
        ),
      ),
    ).toBe('template');
  });

  it('refuses a GET that is declared a mutation', () => {
    expect(
      templateRule(() =>
        renderRequest('mutation', mutation({ method: 'GET' }), {
          inputs: {},
          values: {},
          nowMs: NOW,
        }),
      ),
    ).toBe('template');
  });

  it('reports a shape refusal on the key as an idempotency_key refusal', () => {
    expect(
      templateRule(() =>
        renderRequest(
          'mutation',
          mutation({
            idempotencyKey: {
              input: 'idempotencyKey',
              shape: { kind: 'uuid-v4' },
            },
          }),
          { inputs: { idempotencyKey: 'not-a-uuid' }, values: {}, nowMs: NOW },
        ),
      ),
    ).toBe('idempotency_key');
  });

  it('refuses an idempotency key that renders empty', () => {
    expect(
      templateRule(() =>
        renderRequest('mutation', mutation({ idempotencyKey: { const: '' } }), {
          inputs: {},
          values: {},
          nowMs: NOW,
        }),
      ),
    ).toBe('idempotency_key');
  });
});

describe('renderRequest body rules', () => {
  it('refuses an integer-like body key, which JSON would reorder', () => {
    expect(
      templateRule(() =>
        renderRequest(
          'mutation',
          mutation({
            body: { json: [{ key: '1', value: { const: 'a' } }], maxBytes: 99 },
          }),
          { inputs: {}, values: {}, nowMs: NOW },
        ),
      ),
    ).toBe('body');
  });

  it('refuses a body key written twice', () => {
    expect(
      templateRule(() =>
        renderRequest(
          'mutation',
          mutation({
            body: {
              json: [
                { key: 'a', value: { const: 'b' } },
                { key: 'a', value: { const: 'c' } },
              ],
              maxBytes: 99,
            },
          }),
          { inputs: {}, values: {}, nowMs: NOW },
        ),
      ),
    ).toBe('body');
  });

  it('leaves out an optional query key whose value is absent', () => {
    const rendered = renderRequest(
      'read',
      {
        class: 'read',
        method: 'GET',
        path: '/x',
        query: [
          { key: 'kept', value: { const: 'v' } },
          {
            key: 'absent',
            value: { input: 'nothing' },
            optional: true,
          },
        ],
      },
      { inputs: {}, values: {}, nowMs: NOW },
    );

    expect(rendered.query).toBe('kept=v');
  });

  it('refuses an optional query key whose value is present but refused', () => {
    expect(
      templateRule(() =>
        renderRequest(
          'read',
          {
            class: 'read',
            method: 'GET',
            path: '/x',
            query: [
              {
                key: 'k',
                value: { input: 'k', shape: { kind: 'uuid-v4' } },
                optional: true,
              },
            ],
          },
          { inputs: { k: 'not-a-uuid' }, values: {}, nowMs: NOW },
        ),
      ),
    ).toBe('shape');
  });
});

describe('renderRequest path rules', () => {
  it('refuses a placeholder with no source', () => {
    expect(
      templateRule(() =>
        renderRequest(
          'read',
          { class: 'read', method: 'GET', path: '/x/{id}' },
          { inputs: {}, values: {}, nowMs: NOW },
        ),
      ),
    ).toBe('path');
  });

  it('refuses a path source that is not a scalar', () => {
    expect(
      templateRule(() =>
        renderRequest(
          'read',
          {
            class: 'read',
            method: 'GET',
            path: '/x/{id}',
            pathParams: { id: { input: 'id' } },
          },
          { inputs: { id: ['a', 'b'] }, values: {}, nowMs: NOW },
        ),
      ),
    ).toBe('path');
  });

  it.each(['', '.', '..'])('refuses the dot segment %p', (segment) => {
    expect(
      templateRule(() =>
        renderRequest(
          'read',
          {
            class: 'read',
            method: 'GET',
            path: '/x/{id}',
            pathParams: { id: { const: segment } },
          },
          { inputs: {}, values: {}, nowMs: NOW },
        ),
      ),
    ).toBe('path');
  });

  it('refuses a declared path parameter the path never uses', () => {
    expect(
      templateRule(() =>
        renderRequest(
          'read',
          {
            class: 'read',
            method: 'GET',
            path: '/x',
            pathParams: { id: { const: 'a' } },
          },
          { inputs: {}, values: {}, nowMs: NOW },
        ),
      ),
    ).toBe('path');
  });

  it('percent-encodes the characters encodeURIComponent leaves alone', () => {
    const rendered = renderRequest(
      'read',
      {
        class: 'read',
        method: 'GET',
        path: '/x/{id}',
        pathParams: { id: { const: "a!'()*b" } },
      },
      { inputs: {}, values: {}, nowMs: NOW },
    );

    expect(rendered.path).toBe('/x/a%21%27%28%29%2Ab');
  });
});

describe('renderRequest source rules', () => {
  it('refuses a missing input, naming the rule', () => {
    expect(
      templateRule(() =>
        renderRequest(
          'read',
          {
            class: 'read',
            method: 'GET',
            path: '/x',
            query: [{ key: 'k', value: { input: 'absent' } }],
          },
          { inputs: {}, values: {}, nowMs: NOW },
        ),
      ),
    ).toBe('input');
  });

  it('refuses a missing value, naming the rule', () => {
    expect(
      templateRule(() =>
        renderRequest(
          'read',
          {
            class: 'read',
            method: 'GET',
            path: '/x',
            query: [
              { key: 'k', value: { value: 'absent', shape: { kind: 'int' } } },
            ],
          },
          { inputs: {}, values: {}, nowMs: NOW },
        ),
      ),
    ).toBe('value');
  });

  it('refuses a map whose input is not a string', () => {
    expect(
      templateRule(() =>
        renderRequest(
          'read',
          {
            class: 'read',
            method: 'GET',
            path: '/x',
            query: [
              {
                key: 'k',
                value: {
                  map: { inputs: ['n'], table: { '1': 'one' } },
                },
              },
            ],
          },
          { inputs: { n: 1 }, values: {}, nowMs: NOW },
        ),
      ),
    ).toBe('map');
  });

  it('refuses a map key the table does not carry', () => {
    expect(
      templateRule(() =>
        renderRequest(
          'read',
          {
            class: 'read',
            method: 'GET',
            path: '/x',
            query: [
              {
                key: 'k',
                value: { map: { inputs: ['s'], table: { buy: 'b' } } },
              },
            ],
          },
          { inputs: { s: 'sell' }, values: {}, nowMs: NOW },
        ),
      ),
    ).toBe('map');
  });
});

describe('renderRequest shape rules', () => {
  const queryShape = (shape: Shape): RequestTemplate => ({
    class: 'read',
    method: 'GET',
    path: '/x',
    query: [{ key: 'k', value: { value: 'v', shape } }],
  });

  const refuse = (shape: Shape, value: unknown): string | undefined =>
    templateRule(() =>
      renderRequest('read', queryShape(shape), {
        inputs: {},
        values: { v: value as Scalar },
        nowMs: NOW,
      }),
    );

  it('refuses an integer outside its bounds', () => {
    expect(refuse({ kind: 'int', min: 1, max: 5 }, 0)).toBe('shape');
    expect(refuse({ kind: 'int', min: 1, max: 5 }, 6)).toBe('shape');
    expect(refuse({ kind: 'int', min: 1, max: 5 }, 1.5)).toBe('shape');
  });

  it('refuses a decimal finer than its scale', () => {
    expect(refuse({ kind: 'decimal', scale: 2 }, '0.001')).toBe('shape');
  });

  it('refuses a decimal outside its bounds', () => {
    expect(
      refuse({ kind: 'decimal', scale: 4, min: '0.01', max: '0.99' }, '0.0099'),
    ).toBe('shape');
    expect(
      refuse({ kind: 'decimal', scale: 4, min: '0.01', max: '0.99' }, '1.0000'),
    ).toBe('shape');
  });

  it('refuses a decimal bound the template itself wrote malformed', () => {
    // A template's own bound is a bundle defect, not a caller error, so it
    // still refuses rather than silently widening the range.
    expect(refuse({ kind: 'decimal', scale: 4, min: 'nope' }, '0.5000')).toBe(
      'shape',
    );
  });

  it('refuses an opaque string that is empty or over-long', () => {
    expect(refuse({ kind: 'opaque', maxLength: 3 }, '')).toBe('shape');
    expect(refuse({ kind: 'opaque', maxLength: 3 }, 'abcd')).toBe('shape');
  });

  it('refuses a value outside a closed set', () => {
    expect(refuse({ kind: 'oneOf', values: ['yes', 'no'] }, 'maybe')).toBe(
      'shape',
    );
  });

  it('refuses an array with too many items, or an item that fails', () => {
    expect(
      refuse({ kind: 'array', of: { kind: 'int' }, maxItems: 2 }, [1, 2, 3]),
    ).toBe('shape');
    expect(
      refuse({ kind: 'array', of: { kind: 'int' }, maxItems: 2 }, [1, 'x']),
    ).toBe('shape');
  });

  it('refuses a time outside its window', () => {
    const nowSec = NOW / 1000;
    expect(
      refuse({ kind: 'time', unit: 's', maxAgeSec: 60 }, nowSec - 61),
    ).toBe('shape');
    expect(
      refuse({ kind: 'time', unit: 's', maxAheadSec: 60 }, nowSec + 61),
    ).toBe('shape');
    expect(refuse({ kind: 'time', unit: 's' }, 1.5)).toBe('shape');
  });

  it('accepts a time inside its window', () => {
    expect(
      refuse({ kind: 'time', unit: 'ms', maxAgeSec: 60, maxAheadSec: 60 }, NOW),
    ).toBeUndefined();
  });
});

describe('renderRequest transform rules', () => {
  const queryTransform = (transform: Transform): RequestTemplate => ({
    class: 'read',
    method: 'GET',
    path: '/x',
    query: [{ key: 'k', value: { input: 'v', transform } }],
  });

  it('trims an input', () => {
    const rendered = renderRequest('read', queryTransform('trim'), {
      inputs: { v: '  padded  ' },
      values: {},
      nowMs: NOW,
    });

    expect(rendered.query).toBe('k=padded');
  });

  it('refuses to trim a value that is not a string', () => {
    expect(
      templateRule(() =>
        renderRequest('read', queryTransform('trim'), {
          inputs: { v: 1 },
          values: {},
          nowMs: NOW,
        }),
      ),
    ).toBe('transform');
  });

  it('renders a decimal at a fixed scale', () => {
    const rendered = renderRequest('read', queryTransform('decimal-fixed-4'), {
      inputs: { v: '0.5' },
      values: {},
      nowMs: NOW,
    });

    expect(rendered.query).toBe('k=0.5000');
  });

  it('refuses to render a value that is not a decimal', () => {
    expect(
      templateRule(() =>
        renderRequest('read', queryTransform('decimal-fixed-2'), {
          inputs: { v: '1.234' },
          values: {},
          nowMs: NOW,
        }),
      ),
    ).toBe('transform');
  });
});

describe('renderRequest invariant rules', () => {
  const invariant = (implementation: string): RequestTemplate =>
    mutation({ invariants: [{ implementation }] });

  it('refuses an invariant this build does not implement', () => {
    expect(
      templateRule(() =>
        renderRequest('mutation', invariant('something-else'), {
          inputs: {},
          values: {},
          nowMs: NOW,
        }),
      ),
    ).toBe('invariant');
  });

  it('refuses an invariant whose body is not a JSON object', () => {
    expect(
      templateRule(() =>
        renderRequest(
          'mutation',
          mutation({
            body: { json: [], maxBytes: 99 },
            invariants: [{ implementation: 'binary-limit-order-v1' }],
          }),
          { inputs: {}, values: {}, nowMs: NOW },
        ),
      ),
    ).toBe('invariant');
  });
});

describe('renderRequest gaps the earlier refusals could not reach', () => {
  it('renders an empty body for a mutation that declares none', () => {
    const rendered = renderRequest('mutation', mutation({ body: undefined }), {
      inputs: {},
      values: {},
      nowMs: NOW,
    });

    expect(rendered.body).toBe('');
  });

  it('refuses a body over the byte limit at the renderer, not only the service', () => {
    expect(
      templateRule(() =>
        renderRequest(
          'mutation',
          mutation({
            body: {
              json: [{ key: 'a', value: { const: 'x'.repeat(64) } }],
              maxBytes: 8,
            },
          }),
          { inputs: {}, values: {}, nowMs: NOW },
        ),
      ),
    ).toBe('max_bytes');
  });

  it('refuses a POST declared a read, which the body check does not catch', () => {
    // No body and no key, so the read checks pass up to the method: this is
    // the only shape that reaches the method rule at all.
    expect(
      templateRule(() =>
        renderRequest(
          'read',
          { class: 'read', method: 'POST', path: '/x' },
          { inputs: {}, values: {}, nowMs: NOW },
        ),
      ),
    ).toBe('template');
  });

  it('passes through a key refusal that is not a shape refusal', () => {
    // A key source that is absent from the inputs is an `input` rule, not a
    // `shape` rule, so it must surface unchanged rather than be relabelled.
    expect(
      templateRule(() =>
        renderRequest(
          'mutation',
          mutation({ idempotencyKey: { input: 'absent' } }),
          { inputs: {}, values: {}, nowMs: NOW },
        ),
      ),
    ).toBe('input');
  });
});
