import type { TemplateInputs, TemplateValues } from './profileTemplates';

/**
 * The `Venue-Authorization` header to attach to the predict-api call.
 */
export interface DeviceAuthHeader {
  name: string;
  value: string;
}

/** One signed mutation: the envelope header plus the EXACT body bytes the
 * signature's `content-digest` component covers. The caller sends these
 * bytes verbatim — re-stringifying anything else breaks the digest. */
export interface SignedOperation {
  header: DeviceAuthHeader;
  /** The exact body bytes. Empty for a bodyless mutation. */
  body: string;
  /** The rendered idempotency key: the signature's `idempotency-key`
   * component, and the body's `client_order_id` when the template renders
   * one. */
  idempotencyKey?: string;
}

/** What a signed intent is rendered from. */
export interface SignOperationInput {
  /** Engine approval-revocation generation pinned by the venue adapter. */
  approvalGeneration?: number;
  /** What the user typed or confirmed, or what the phone generated. */
  inputs?: TemplateInputs;
  /** Locally computed values (`price`, `count`). Never serialized into the
   * envelope; the signature covers the rendered bytes alone. */
  values?: TemplateValues;
  /**
   * The user confirmed this intent on screen. Required the first time a
   * `per-intent` payload is signed. A later signature of the same body does
   * not need it.
   */
  confirmed?: boolean;
}
