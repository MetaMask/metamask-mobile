import { KALSHI_AUTHENTICATION_PROFILE } from './venueAuthProfiles';
import type { TemplateProfile } from './signing/venueTemplates';

/** Header that carries the signatures. The same name for every venue. */
export const VENUE_AUTHORIZATION_HEADER = 'Venue-Authorization';

/**
 * Pinned signing data for one venue (ADR-0004). The profile holds a template
 * for every venue request the phone may sign. The phone renders each request
 * from a template, the user's own inputs and the named values predict-api
 * returned, then signs it. predict-api sends values, never request bytes, and
 * no predict-api response can add to or change this data.
 */
export interface VenueSigningProfile extends TemplateProfile {
  readonly id: string;
  /** The authentication profile whose device key and A2T sign for this one. */
  readonly authenticationProfileId: string;
  /** Allowlisted signing implementation and its parameters. */
  readonly implementation: {
    readonly id: 'device-p256-rfc9421-v1';
    readonly params: {
      /** `@authority` the venue verifies. Never taken from a response. */
      readonly authority: string;
      readonly label: string;
      readonly tag: string;
      readonly lifetimeSec: number;
      /** `Authorization` scheme in front of the A2T. */
      readonly tokenScheme: string;
      readonly headers: {
        readonly requestId: string;
        readonly key: string;
        readonly salt: string;
      };
      /** Most signatures one `Venue-Authorization` header carries. */
      readonly maxSignatures: number;
    };
  };
}

/** Operations predict-api names and the phone may sign, by profile. */
export type VenueOperationName =
  | 'portfolio.balance'
  | 'onboarding.status'
  | 'onboarding.start'
  | 'onboarding.link'
  | 'onboarding.verify'
  | 'onboarding.activate'
  | 'orders.preview'
  | 'orders.commit'
  | 'portfolio.positions'
  | 'portfolio.summary'
  | 'portfolio.activity';

const TRADE_API = '/trade-api/v2';
const OPAQUE_CURSOR = {
  value: 'cursor',
  shape: { kind: 'opaque', maxLength: 512 },
} as const;
/** One settlements read per resolved ticker, bounded by maxSignatures. */
const TICKERS = {
  value: 'tickers',
  as: 'ticker',
  shape: {
    kind: 'array',
    of: { kind: 'opaque', maxLength: 256 },
    maxItems: 4,
  },
} as const;
const IDEMPOTENCY_KEY = { input: 'idempotencyKey' } as const;
const IDEMPOTENCY_UUID = {
  input: 'idempotencyKey',
  shape: { kind: 'uuid-v4' },
} as const;
/** Kalshi's taker fee is at most 2 cents per contract. */
const ORDER_FEE_CEILING_CENTS = 2;
const MARKET_ID = {
  input: 'marketId',
  shape: { kind: 'opaque', maxLength: 128 },
} as const;
const WHEN_BUY = { input: 'action', equals: 'buy' } as const;
const WHEN_SELL = { input: 'action', equals: 'sell' } as const;

/**
 * Kalshi demo. The authority is what Kalshi demo verifies, even though
 * predict-api sends to `external-api.demo.kalshi.co`. Production has no
 * profile until Kalshi confirms its values.
 */
export const KALSHI_DEMO_SIGNING_PROFILE: VenueSigningProfile = {
  id: 'kalshi-demo-signing-v2',
  authenticationProfileId: KALSHI_AUTHENTICATION_PROFILE.id,
  implementation: {
    id: 'device-p256-rfc9421-v1',
    params: {
      authority: 'demo-api.kalshi.co',
      label: 'kalshi',
      tag: 'kalshi-device-request-v1',
      lifetimeSec: 60,
      tokenScheme: 'Kalshi-A2T',
      headers: {
        requestId: 'kalshi-device-request-id',
        key: 'kalshi-device-key',
        salt: 'kalshi-device-key-salt',
      },
      maxSignatures: 4,
    },
  },
  operations: {
    'portfolio.balance': {
      class: 'read',
      steps: { default: [{ request: 'balance' }] },
    },
    'onboarding.status': {
      class: 'read',
      steps: {
        default: [{ request: 'balance' }, { request: 'enrollment_current' }],
      },
    },
    'onboarding.start': {
      class: 'mutation',
      steps: { default: [{ request: 'enrollment_intent' }] },
    },
    'onboarding.link': {
      class: 'mutation',
      steps: { default: [{ request: 'link' }] },
    },
    'onboarding.verify': {
      class: 'mutation',
      steps: { default: [{ request: 'link_verify' }] },
    },
    'onboarding.activate': {
      class: 'mutation',
      confirmation: 'per-intent',
      steps: { default: [{ request: 'wallet_register' }] },
    },
    'orders.preview': {
      class: 'read',
      steps: {
        default: [
          { request: 'balance', when: WHEN_BUY },
          { request: 'positions_for_market', when: WHEN_SELL },
          { request: 'market_restriction' },
        ],
      },
    },
    'orders.commit': {
      class: 'mutation',
      confirmation: 'per-intent',
      steps: {
        submit: [
          { request: 'balance', when: WHEN_BUY },
          { request: 'positions_for_market', when: WHEN_SELL },
          { request: 'order_create' },
        ],
        lookup: [{ request: 'order_lookup' }],
        scan: [{ request: 'order_scan' }],
        none: [],
      },
    },
    'portfolio.positions': {
      class: 'read',
      steps: {
        holdings: [{ request: 'holdings_page' }],
        settlements: [{ request: 'holding_settlement', each: TICKERS }],
      },
    },
    'portfolio.summary': {
      class: 'read',
      steps: {
        holdings: [{ request: 'holdings_page' }],
        balance: [{ request: 'balance' }],
        settlements: [{ request: 'holding_settlement', each: TICKERS }],
      },
    },
    'portfolio.activity': {
      class: 'read',
      steps: {
        settlements: [{ request: 'activity_settlements' }],
        archive: [{ request: 'historical_positions' }],
      },
    },
  },
  requests: {
    balance: {
      class: 'read',
      method: 'GET',
      path: `${TRADE_API}/portfolio/balance`,
    },
    enrollment_current: {
      class: 'read',
      method: 'GET',
      path: `${TRADE_API}/isv/enrollment/intents/current`,
    },
    enrollment_intent: {
      class: 'mutation',
      method: 'POST',
      path: `${TRADE_API}/isv/enrollment/intents`,
      body: 'empty',
      idempotencyKey: IDEMPOTENCY_KEY,
    },
    link: {
      class: 'mutation',
      method: 'POST',
      path: `${TRADE_API}/isv/users/link`,
      body: {
        json: [
          {
            key: 'email',
            value: {
              input: 'email',
              transform: 'trim',
              shape: { kind: 'opaque', maxLength: 320 },
            },
          },
        ],
        maxBytes: 512,
      },
      idempotencyKey: IDEMPOTENCY_KEY,
    },
    link_verify: {
      class: 'mutation',
      method: 'POST',
      path: `${TRADE_API}/isv/users/link/verify`,
      body: {
        json: [
          {
            key: 'code',
            value: { input: 'code', shape: { kind: 'opaque', maxLength: 32 } },
          },
        ],
        maxBytes: 128,
      },
      idempotencyKey: IDEMPOTENCY_KEY,
    },
    wallet_register: {
      class: 'mutation',
      method: 'POST',
      path: `${TRADE_API}/isv/wallet/register`,
      body: {
        json: [
          {
            key: 'wallet_address',
            value: {
              input: 'walletAddress',
              shape: { kind: 'opaque', maxLength: 128 },
            },
          },
          {
            key: 'network',
            value: {
              input: 'network',
              shape: { kind: 'opaque', maxLength: 32 },
            },
          },
        ],
        maxBytes: 512,
      },
      idempotencyKey: IDEMPOTENCY_KEY,
    },
    positions_for_market: {
      class: 'read',
      method: 'GET',
      path: `${TRADE_API}/portfolio/positions`,
      query: [
        { key: 'ticker', value: MARKET_ID },
        { key: 'count_filter', value: { const: 'position' } },
        { key: 'limit', value: { const: 200 } },
      ],
    },
    market_restriction: {
      class: 'read',
      method: 'GET',
      path: `${TRADE_API}/isv/market-restriction`,
      query: [{ key: 'ticker', value: MARKET_ID }],
    },
    order_create: {
      class: 'mutation',
      method: 'POST',
      path: `${TRADE_API}/portfolio/events/orders`,
      body: {
        json: [
          { key: 'ticker', value: MARKET_ID },
          { key: 'client_order_id', value: IDEMPOTENCY_UUID },
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
          {
            key: 'self_trade_prevention_type',
            value: { const: 'taker_at_cross' },
          },
        ],
        maxBytes: 1024,
      },
      idempotencyKey: IDEMPOTENCY_UUID,
      invariants: [
        {
          implementation: 'binary-limit-order-v1',
          params: {
            pricing: 'yes-leg',
            feeCeilingCentsPerContract: ORDER_FEE_CEILING_CENTS,
            amountInput: 'amountCents',
            contractsInput: 'contracts',
            minOutcomePriceInput: 'minOutcomePrice',
          },
        },
      ],
    },
    order_lookup: {
      class: 'read',
      method: 'GET',
      path: `${TRADE_API}/portfolio/orders/{order_id}`,
      pathParams: {
        order_id: { value: 'order_id', shape: { kind: 'uuid-v4' } },
      },
    },
    order_scan: {
      class: 'read',
      method: 'GET',
      path: `${TRADE_API}/portfolio/orders`,
      query: [
        { key: 'ticker', value: MARKET_ID },
        {
          key: 'min_ts',
          value: {
            value: 'min_ts',
            shape: {
              kind: 'time',
              unit: 's',
              maxAgeSec: 2400,
              maxAheadSec: 60,
            },
          },
        },
        { key: 'limit', value: { const: 200 } },
        {
          key: 'cursor',
          value: { value: 'cursor', shape: { kind: 'opaque', maxLength: 512 } },
          optional: true,
        },
      ],
    },
    holdings_page: {
      class: 'read',
      method: 'GET',
      path: `${TRADE_API}/portfolio/positions`,
      query: [
        { key: 'count_filter', value: { const: 'position' } },
        { key: 'limit', value: { const: 200 } },
        { key: 'cursor', value: OPAQUE_CURSOR, optional: true },
      ],
    },
    holding_settlement: {
      class: 'read',
      method: 'GET',
      path: `${TRADE_API}/portfolio/settlements`,
      query: [
        {
          key: 'ticker',
          value: { value: 'ticker', shape: { kind: 'opaque', maxLength: 256 } },
        },
        { key: 'limit', value: { const: 10 } },
      ],
    },
    activity_settlements: {
      class: 'read',
      method: 'GET',
      path: `${TRADE_API}/portfolio/settlements`,
      query: [
        { key: 'limit', value: { const: 200 } },
        {
          key: 'max_ts',
          value: {
            value: 'max_ts',
            shape: { kind: 'time', unit: 's', maxAheadSec: 60 },
          },
          optional: true,
        },
        { key: 'cursor', value: OPAQUE_CURSOR, optional: true },
      ],
    },
    historical_positions: {
      class: 'read',
      method: 'GET',
      path: `${TRADE_API}/historical/positions`,
      query: [{ key: 'limit', value: { const: 1 } }],
    },
  },
};

const BUNDLED_SIGNING_PROFILES: readonly VenueSigningProfile[] = [
  KALSHI_DEMO_SIGNING_PROFILE,
];

/** The bundled signing profile for an authentication profile, if any. */
export const resolveBundledSigningProfile = (
  authenticationProfileId: string,
): VenueSigningProfile | undefined =>
  BUNDLED_SIGNING_PROFILES.find(
    (profile) => profile.authenticationProfileId === authenticationProfileId,
  );

/** Covered components, in signature order, for one request method. */
export const coveredComponents = (
  profile: VenueSigningProfile,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
): readonly string[] => {
  const { headers } = profile.implementation.params;
  const read = [
    '@method',
    '@authority',
    '@path',
    '@query',
    'authorization',
    headers.requestId,
    headers.key,
    headers.salt,
  ];
  return method === 'GET'
    ? read
    : [...read, 'content-digest', 'content-type', 'idempotency-key'];
};
