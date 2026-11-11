/**
 * Plain-TS mirror of predict-api's `venue-profile/profile-schema.ts` zod
 * types (plan §5: the shared contract). The document is schema-validated
 * here by small structural checks in `venueSigningProfiles.ts` — the DSL
 * itself (`profileTemplates.ts`) refuses anything a template cannot render,
 * so the two layers stay in step. Keep in sync with the api schema.
 */

/** The DSL level a profile is written for. */
export type DslVersion = 'dsl-1';

/**
 * The DSL value types live in the renderer, which is the one place that
 * must agree with predict-api's `venue-profile/profile-schema.ts` zod
 * union. Re-exported here so the document shape and the renderer cannot
 * drift apart.
 */
export type {
  Scalar,
  Shape,
  Source,
  TemplateValues,
  Transform,
} from './profileTemplates';

import type { Source } from './profileTemplates';

/** One JSON body field: key plus the source that renders its value. */
export interface BodyField {
  readonly key: string;
  readonly value: Source;
}

/** `http-rfc9421`: one signed HTTP request the phone renders and signs. */
export interface HttpRfc9421Payload {
  readonly kind: 'http-rfc9421';
  readonly method: 'GET' | 'POST';
  readonly path: string;
  /** Fills `{name}` segments in `path`; the value sources resolve like body
   * fields. */
  readonly pathParams?: Readonly<Record<string, Source>>;
  /** Ordered query pairs; an optional pair drops out when its value is
   * absent, not when it is refused. */
  readonly query?: readonly {
    readonly key: string;
    readonly value: Source;
    readonly optional?: boolean;
  }[];
  readonly body?: {
    readonly json: readonly BodyField[];
    readonly maxBytes: number;
  };
  /** Phone-generated id; renders to the `Idempotency-Key` header. */
  readonly idempotencyKey?: Source;
  /** Server-checked invariants; the phone re-checks for the display. */
  readonly invariants?: readonly {
    readonly implementation: string;
    readonly params?: Readonly<Record<string, string | number | boolean>>;
  }[];
}

/** Payload kinds declared by the schema but not rendered by this build. */
export type OpaquePayload = {
  readonly kind: 'eip712' | 'evm-calls';
} & Record<string, unknown>;

export type Payload = HttpRfc9421Payload | OpaquePayload;

/** One thing the user can do, signed per intent. */
export interface Intent {
  /** Stable id, e.g. `order.place`. */
  readonly id: string;
  /** The payloads a single confirmation signs, in order. */
  readonly payloads: readonly string[];
  /** Server-checked invariants covering the whole intent. */
  readonly invariant?: {
    readonly implementation: string;
    readonly params: Readonly<Record<string, string | number | boolean>>;
  };
  readonly confirm: {
    readonly kind: 'per-intent';
    /** Signatures allowed per confirmed payload body. */
    readonly signLimit: number;
  };
}

/** GET the phone may sign on its own, before any server proposal. */
export interface ReadPattern {
  readonly method: 'GET';
  readonly path: string;
}

/** The parsed, verified profile document payload. */
export interface SigningProfile {
  readonly id: string;
  /** Monotonic; the server refuses to accept an older version again. */
  readonly version: number;
  readonly minDsl: DslVersion;
  readonly venue: string;
  readonly intents: readonly Intent[];
  /** Payload registry the intents name. */
  readonly payloads: Readonly<Record<string, Payload>>;
  /** L1 read allowlist for phone-initiated GETs. Required: predict-api's
   * profile schema rejects a document without it, and every signer needs it. */
  readonly reads: {
    readonly allow: readonly ReadPattern[];
    readonly maxPathLength: number;
  };
  /** Required for the same reason: signing is impossible without it. */
  readonly implementation: {
    readonly id: 'device-p256-rfc9421-v1';
    readonly params: ImplementationParams;
  };
}

export interface ImplementationParams {
  readonly authority: string;
  readonly label: string;
  readonly tag: string;
  readonly lifetimeSec: number;
  readonly tokenScheme: string;
  readonly headers: {
    readonly requestId: string;
    readonly key: string;
    readonly salt: string;
  };
  readonly maxSignatures: number;
}
