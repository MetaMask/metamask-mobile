import { KALSHI_AUTHENTICATION_PROFILE } from './venueAuthProfiles';

/**
 * Pinned signing data for one venue (ADR-0003). predict-api builds every
 * venue request. The phone signs one only when it matches an operation here
 * and its body carries exactly what the user typed or confirmed. No
 * predict-api response can add to or change this data.
 */
export interface VenueSigningProfile {
  readonly id: string;
  /** The authentication profile whose device key and A2T sign for this one. */
  readonly authenticationProfileId: string;
  /** Allowlisted signing implementation. */
  readonly scheme: 'device-p256-rfc9421-v1';
  /** `@authority` the venue verifies. Never taken from a response. */
  readonly authority: string;
  readonly signature: {
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
  };
  /** predict-api header that carries the signatures. */
  readonly envelopeHeader: string;
  /** Keyed by the `ref` predict-api puts on each request. */
  readonly operations: Readonly<Record<string, VenueOperationRule>>;
}

/** One body field and the intent input it must equal. */
export interface VenueBodyField {
  readonly field: string;
  readonly input: string;
}

export type VenueOperationRule =
  | {
      readonly class: 'read';
      readonly method: 'GET';
      readonly path: string;
    }
  | {
      readonly class: 'mutation';
      readonly method: 'POST';
      readonly path: string;
      /**
       * `empty` is a zero-byte body. Otherwise the body is a canonical JSON
       * object with exactly these string fields, in any order.
       */
      readonly body: 'empty' | readonly VenueBodyField[];
    };

const TRADE_API = '/trade-api/v2';

/**
 * Kalshi demo. The authority is what Kalshi demo verifies, even though
 * predict-api sends to `external-api.demo.kalshi.co`. Production has no
 * profile until Kalshi confirms its values.
 */
export const KALSHI_DEMO_SIGNING_PROFILE: VenueSigningProfile = {
  id: 'kalshi-demo-signing-v1',
  authenticationProfileId: KALSHI_AUTHENTICATION_PROFILE.id,
  scheme: 'device-p256-rfc9421-v1',
  authority: 'demo-api.kalshi.co',
  signature: {
    label: 'kalshi',
    tag: 'kalshi-device-request-v1',
    lifetimeSec: 60,
    tokenScheme: 'Kalshi-A2T',
    headers: {
      requestId: 'kalshi-device-request-id',
      key: 'kalshi-device-key',
      salt: 'kalshi-device-key-salt',
    },
  },
  envelopeHeader: 'Kalshi-Device-Auth',
  operations: {
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
    },
    link: {
      class: 'mutation',
      method: 'POST',
      path: `${TRADE_API}/isv/users/link`,
      body: [{ field: 'email', input: 'email' }],
    },
    link_verify: {
      class: 'mutation',
      method: 'POST',
      path: `${TRADE_API}/isv/users/link/verify`,
      body: [{ field: 'code', input: 'code' }],
    },
    wallet_register: {
      class: 'mutation',
      method: 'POST',
      path: `${TRADE_API}/isv/wallet/register`,
      body: [
        { field: 'wallet_address', input: 'walletAddress' },
        { field: 'network', input: 'network' },
      ],
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
  method: 'GET' | 'POST',
): readonly string[] => {
  const { headers } = profile.signature;
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
