import {
  renderRequest,
  TemplateError,
  type RequestTemplate,
} from './profileTemplates';
import { loadVenueProfile } from '../venueSigningProfiles';
import type { SigningProfile } from '../venueSigningProfiles';

// The bundled trading profile document; `loadVenueProfile` verifies it.
let profile: SigningProfile;

beforeAll(async () => {
  profile = (await loadVenueProfile()) as SigningProfile;
});

const NOW = 1_700_000_000_000;

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
    body: { json: payload.body.json, maxBytes: payload.body.maxBytes },
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
    body: { json: payload.body.json, maxBytes: payload.body.maxBytes },
    idempotencyKey: payload.idempotencyKey,
  };
};

const orderValues = {
  price: '0.4500',
  count: '10.00',
};

describe('renderRequest for order.place', () => {
  it('renders the create_order body with values and inputs resolved', () => {
    const rendered = renderRequest(
      'create_order',
      createOrder(),
      {
        inputs: {
          action: 'buy',
          outcome: 'yes',
          marketId: 'MKT-XYZ',
          idempotencyKey: 'a1b2c3d4-1111-4222-8333-444455556666',
          amountCents: 470,
        },
        values: orderValues,
        nowMs: NOW,
      },
    );

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
    const rendered = renderRequest(
      'create_order',
      createOrder(),
      {
        inputs: {
          action: 'sell',
          outcome: 'no',
          marketId: 'MKT-XYZ',
          idempotencyKey: 'a1b2c3d4-1111-4222-8333-444455556666',
          contracts: '10.00',
        },
        values: orderValues,
        nowMs: NOW,
      },
    );

    expect(JSON.parse(rendered.body).side).toBe('bid');
  });

  it('derives the venue display figures from the invariant', () => {
    const rendered = renderRequest(
      'create_order',
      createOrder(),
      {
        inputs: {
          action: 'buy',
          outcome: 'yes',
          marketId: 'MKT-XYZ',
          idempotencyKey: 'a1b2c3d4-1111-4222-8333-444455556666',
          amountCents: 470,
        },
        values: orderValues,
        nowMs: NOW,
      },
    );

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
    const rendered = renderRequest(
      'wallet_register',
      walletRegister(),
      {
        inputs: {
          walletAddress: '0xabc',
          network: 'eip155:1',
          idempotencyKey: 'a1b2c3d4-1111-4222-8333-444455556666',
        },
        values: {},
        nowMs: NOW,
      },
    );

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
