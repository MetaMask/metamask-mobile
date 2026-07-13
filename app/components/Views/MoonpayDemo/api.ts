/**
 * MoonPay Identity API — HTTP helpers.
 *
 * Implements the endpoints described in the MoonPay Identity API Partner
 * Integration Guide (2026-06-22). Step numbers in the comments refer to the
 * integration walkthrough in that document.
 *
 * Step 2  — POST  /platform/v1/sessions             (server, via UKYC)
 * Step 4  — POST  /platform/v1/identities           (client, Bearer accessToken)
 * Step 5  — PATCH /platform/v1/identities/{id}      (client, Bearer accessToken)
 * Step 5b — POST /platform/v1/identities/{id}/files/upload-url
 * (cont.) — PUT  <presigned url> (no auth — URL is credential)
 * (cont.) — POST /platform/v1/identities/{id}/files
 * Step 6  — POST  /platform/v1/identities/{id}/verifications
 * Step 7  — GET   /platform/v1/identities/{id}      (poll)
 *
 * MoonPay wraps everything in a `{ data: ... }` envelope; these helpers
 * unwrap it for you.
 */

import { Platform } from 'react-native';
import Engine from '../../../core/Engine';

// ---------------------------------------------------------------------------
// Endpoint configuration
// ---------------------------------------------------------------------------

// Android emulator uses 10.0.2.2 to reach the host machine's localhost.
export const UKYC_API_BASE_URL =
  process.env.UKYC_API_BASE_URL ||
  (Platform.select({
    android: 'http://10.0.2.2:3000',
    default: 'http://localhost:3000',
  }) as string);

// Bearer for the local Universal KYC service in dev.
export const UKYC_BEARER_TOKEN = '123';

// MoonPay Platform API. See the "Before you begin" section of the guide.
export const MOONPAY_API_BASE_URL = 'https://api.moonpay.com';

// ---------------------------------------------------------------------------
// Step 2 — Create a session (delegated to the local UKYC service)
// ---------------------------------------------------------------------------

export interface CreateSessionParams {
  email: string;
  // ISO 8601 timestamp captured from the customer's Terms-of-Use acceptance.
  // No more than 60 seconds in the future. No past limit.
  termsAcceptedAt: string;
}

export interface CreateSessionResponse {
  sessionToken: string;
  // Local UKYC service may surface additional fields (e.g. internal user id);
  // we accept any extra keys and ignore them.
  [key: string]: unknown;
}

/**
 * Calls the local Universal KYC service to create a MoonPay session. The
 * UKYC service holds the MoonPay secret API key and calls
 * `POST https://api.moonpay.com/platform/v1/sessions` on the client's behalf.
 */
export async function createSession(
  params: CreateSessionParams,
): Promise<CreateSessionResponse> {
  const bearerToken =
    await Engine.context.AuthenticationController.getBearerToken();
  const response = await fetch(
    `${UKYC_API_BASE_URL}/vendors/moonpay/sessions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bearerToken}`,
      },
      body: JSON.stringify(params),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `POST /vendors/moonpay/sessions failed (${response.status}): ${errorBody}`,
    );
  }

  const data = (await response.json()) as CreateSessionResponse;
  if (!data.sessionToken) {
    throw new Error(
      `UKYC sessions response missing sessionToken. Got keys: ${Object.keys(
        data,
      ).join(', ')}`,
    );
  }
  return data;
}

// ---------------------------------------------------------------------------
// Identity resource types (per the "Data reference" section of the guide)
// ---------------------------------------------------------------------------

export type IdentityStatus =
  | 'created'
  | 'collecting'
  | 'verifying'
  | 'approved'
  | 'rejected'
  | 'manualReview'
  | 'blocked';

export type RequirementType =
  | 'email'
  | 'phoneNumber'
  | 'basicDetails'
  | 'residentialAddress'
  | 'identityDocuments'
  | 'proofOfAddress'
  | 'taxIdentifiers';

/**
 * Per-requirement detail. MoonPay keys these by requirement type inside the
 * `requirements` object (NOT a `{ required: [] }` array), e.g.
 * `requirements.residentialAddress = { status, requiredFields }`.
 */
export interface RequirementDetail {
  status: 'incomplete' | 'complete';
  requiredFields?: string[];
  taxIdentifierType?: 'ssn' | 'cpf' | 'tin';
}

/**
 * The set of requirements MoonPay expects, keyed by requirement type. Only
 * the keys present are pending/relevant for the identity's jurisdiction.
 */
export type IdentityRequirements = Partial<
  Record<RequirementType, RequirementDetail>
>;

export interface IdentityCapability {
  product: 'ramps';
}

export interface Identity {
  id: string;
  status: IdentityStatus;
  capabilities: IdentityCapability[];
  requirements: IdentityRequirements;
  createdAt: string;
  updatedAt: string;
}

export interface BasicDetailsSubmission {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string; // YYYY-MM-DD
  nationality?: string; // ISO 3166-1 alpha-3
}

export interface AddressSubmission {
  country?: string; // ISO 3166-1 alpha-3
  street?: string;
  subStreet?: string;
  locality?: string;
  administrativeArea?: string;
  postalCode?: string;
}

export interface PhoneNumberSubmission {
  number: string; // E.164, e.g. "+12025550143"
}

export interface TaxIdentifierSubmission {
  type: 'ssn' | 'cpf' | 'tin';
  value: string;
  country?: string; // required for type "tin"
}

export interface IdentitySubmission {
  basicDetails?: BasicDetailsSubmission;
  residentialAddress?: AddressSubmission;
  phoneNumber?: PhoneNumberSubmission;
  taxIdentifiers?: TaxIdentifierSubmission[];
}

// ---------------------------------------------------------------------------
// Authenticated fetch (Bearer accessToken from the Auth frame)
// ---------------------------------------------------------------------------

interface FetchOpts {
  accessToken: string;
  method?: string;
  body?: unknown;
  // For binary uploads to the presigned URL we want a raw `fetch`. Default
  // assumes a JSON request + `{ data }`-envelope JSON response.
  raw?: boolean;
}

async function moonpayFetch<T>(path: string, opts: FetchOpts): Promise<T> {
  const url = path.startsWith('http') ? path : `${MOONPAY_API_BASE_URL}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${opts.accessToken}`,
  };
  let body: BodyInit | undefined;
  if (opts.body !== undefined) {
    if (opts.raw) {
      body = opts.body as BodyInit;
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(opts.body);
    }
  }

  const response = await fetch(url, {
    method: opts.method ?? 'GET',
    headers,
    body,
  });

  // 204 No Content — identity already complete (Step 4) etc.
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `${opts.method ?? 'GET'} ${path} failed (${response.status}): ${errorBody}`,
    );
  }

  if (opts.raw) {
    return (await response.text()) as unknown as T;
  }

  const json = (await response.json()) as { data: T };
  return json.data;
}

// ---------------------------------------------------------------------------
// Step 4 — Create an identity
// ---------------------------------------------------------------------------

export interface CreateIdentityParams {
  accessToken: string;
  // ISO 3166-1 alpha-3 country code. Required.
  country: string;
  capabilities?: IdentityCapability[];
}

/**
 * POST /platform/v1/identities
 *
 * Returns either the freshly created Identity (status === 'created'), or
 * `null` when MoonPay responded 204 No Content (customer already satisfies
 * the requested capabilities — skip straight to payment).
 */
export async function createIdentity(
  params: CreateIdentityParams,
): Promise<Identity | null> {
  const result = await moonpayFetch<Identity | undefined>(
    '/platform/v1/identities',
    {
      accessToken: params.accessToken,
      method: 'POST',
      body: {
        residentialAddress: { country: params.country },
        capabilities: params.capabilities ?? [{ product: 'ramps' }],
      },
    },
  );
  return result ?? null;
}

// ---------------------------------------------------------------------------
// Step 5 — Submit requirements
// ---------------------------------------------------------------------------

/**
 * PATCH /platform/v1/identities/{id}
 *
 * Fields merge progressively. Submit `residentialAddress.country` on its own
 * first — country drives the full requirement set, and is sticky once any
 * other field has been submitted.
 */
export async function patchIdentity(
  accessToken: string,
  identityId: string,
  submission: IdentitySubmission,
): Promise<Identity> {
  const updated = await moonpayFetch<Identity>(
    `/platform/v1/identities/${identityId}`,
    {
      accessToken,
      method: 'PATCH',
      body: submission,
    },
  );
  return updated;
}

// ---------------------------------------------------------------------------
// Step 5b — Document upload (presigned URL flow)
// ---------------------------------------------------------------------------

export type FileType =
  | 'passport'
  | 'nationalIdentityCard'
  | 'drivingLicence'
  | 'residencePermit'
  | 'selfie'
  | 'proofOfAddress';

export type FileMimeType = 'image/jpeg' | 'image/png' | 'application/pdf';

export interface UploadUrlResponse {
  uploadId: string;
  url: string;
  expiresAt: string;
  headers: Record<string, string>;
}

export interface RequestUploadUrlParams {
  accessToken: string;
  identityId: string;
  fileType: FileType;
  // Required for two-sided documents (drivingLicence, nationalIdentityCard,
  // residencePermit). Omit for single-sided.
  side?: 'front' | 'back';
  mimeType: FileMimeType;
}

export async function requestUploadUrl(
  params: RequestUploadUrlParams,
): Promise<UploadUrlResponse> {
  return moonpayFetch<UploadUrlResponse>(
    `/platform/v1/identities/${params.identityId}/files/upload-url`,
    {
      accessToken: params.accessToken,
      method: 'POST',
      body: {
        fileType: params.fileType,
        ...(params.side ? { side: params.side } : {}),
        mimeType: params.mimeType,
      },
    },
  );
}

/**
 * Upload the file binary directly to the presigned URL. No MoonPay
 * authentication — the URL is the credential. Use the `Content-Type` returned
 * by `requestUploadUrl` (matches `mimeType` you requested).
 */
export async function uploadFileBinary(
  uploadUrl: string,
  contentType: string,
  body: Blob | ArrayBuffer | Uint8Array,
): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: body as BodyInit,
  });
  if (!response.ok) {
    throw new Error(
      `PUT presigned upload failed (${response.status}): ${await response.text()}`,
    );
  }
}

export interface ConfirmFileEntry {
  uploadId: string;
  fileType: FileType;
  side?: 'front' | 'back';
}

/**
 * POST /platform/v1/identities/{id}/files — confirm completed uploads and
 * attach them to the identity. Two-sided documents must include both sides
 * in the same call.
 */
export async function confirmFiles(
  accessToken: string,
  identityId: string,
  files: ConfirmFileEntry[],
): Promise<Identity> {
  return moonpayFetch<Identity>(`/platform/v1/identities/${identityId}/files`, {
    accessToken,
    method: 'POST',
    body: { files },
  });
}

// ---------------------------------------------------------------------------
// Step 6 — Trigger verification
// ---------------------------------------------------------------------------

export interface VerificationChallenge {
  id: string;
  url: string;
  expiresAt: string;
}

export type VerificationStatus =
  | 'challengeRequired'
  | 'processing'
  | 'approved';

export interface VerificationResponse {
  status: VerificationStatus;
  challenge?: VerificationChallenge;
}

/**
 * POST /platform/v1/identities/{id}/verifications
 *
 * The challenge URL and token are single-use. If the customer cancels or the
 * frame errors, call this again to receive a fresh URL.
 */
export async function startVerification(
  accessToken: string,
  identityId: string,
): Promise<VerificationResponse> {
  return moonpayFetch<VerificationResponse>(
    `/platform/v1/identities/${identityId}/verifications`,
    {
      accessToken,
      method: 'POST',
    },
  );
}

// ---------------------------------------------------------------------------
// Step 7 — Poll the identity for a terminal outcome
// ---------------------------------------------------------------------------

export async function getIdentity(
  accessToken: string,
  identityId: string,
): Promise<Identity> {
  return moonpayFetch<Identity>(`/platform/v1/identities/${identityId}`, {
    accessToken,
  });
}

const TERMINAL_STATUSES: ReadonlySet<IdentityStatus> = new Set([
  'approved',
  'rejected',
  'manualReview',
  'blocked',
] as const);

export interface PollIdentityOptions {
  intervalMs?: number;
  // Returns true to abort polling; lets callers tear down on screen exit.
  shouldAbort?: () => boolean;
  // Called with each intermediate Identity snapshot.
  onTick?: (identity: Identity) => void;
}

/**
 * Poll GET /platform/v1/identities/{id} until status reaches a terminal
 * value (approved, rejected, manualReview, blocked). manualReview is
 * non-terminal per the guide — we continue polling — but exposing it through
 * `onTick` lets the UI surface the holding state.
 */
export async function pollForOutcome(
  accessToken: string,
  identityId: string,
  opts: PollIdentityOptions = {},
): Promise<Identity> {
  const interval = opts.intervalMs ?? 3000;
  // The guide's `pollForOutcome` example treats `manualReview` as terminal;
  // the surrounding prose suggests treating it as a holding state. We use the
  // strict definition (status reaches one of the terminal values) and let
  // callers re-decide whether to keep polling.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (opts.shouldAbort?.()) {
      throw new Error('Polling aborted');
    }
    const identity = await getIdentity(accessToken, identityId);
    opts.onTick?.(identity);
    if (TERMINAL_STATUSES.has(identity.status)) {
      return identity;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}
