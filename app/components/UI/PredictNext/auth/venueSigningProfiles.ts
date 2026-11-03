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
  | 'onboarding.activate';

const TRADE_API = '/trade-api/v2';
const IDEMPOTENCY_KEY = { input: 'idempotencyKey' } as const;

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
