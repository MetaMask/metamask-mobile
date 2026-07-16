/**
 * MoonPay Identity API — HTTP helpers.
 *
 * Implements the endpoints described in the MoonPay Identity API Partner
 * Integration Guide (2026-06-22). Step numbers in the comments refer to the
 * integration walkthrough in that document.
 *
 * Step 2  — POST  /vendors/moonpay/sessions       (server, via UKYC)
 * Step 4  — POST  /vendors/moonpay/kyc-required   (server, via UKYC)
 *
 * Both endpoints are served by the local Universal KYC service and are
 * authenticated with the wallet's identity bearer token.
 */

import { Platform } from 'react-native';
import Engine from '../../../core/Engine';
import { alpha2ToAlpha3 } from './countryCodes';

// ---------------------------------------------------------------------------
// Endpoint configuration
// ---------------------------------------------------------------------------

export const UKYC_API_BASE_URL =
  process.env.UKYC_API_BASE_URL ||
  (Platform.select({
    android: 'http://10.0.2.2:3000',
    default: 'http://localhost:3000',
  }) as string);

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

async function getBearerToken(): Promise<string> {
  const bearerToken =
    await Engine.context.AuthenticationController.getBearerToken();
  if (!bearerToken) {
    throw new Error(
      'Unable to obtain an authentication bearer token — is the wallet signed in?',
    );
  }
  return bearerToken;
}

// ---------------------------------------------------------------------------
// Geolocation helper
// ---------------------------------------------------------------------------

/**
 * Resolves the customer's country from the wallet's `GeolocationController`.
 *
 * The controller returns an ISO 3166-2 code (e.g. "US", "US-NY", "CA-ON"); we
 * keep the leading ISO 3166-1 alpha-2 country segment and convert it to the
 * alpha-3 code (e.g. "USA") expected by the MoonPay Identity API.
 */
export async function fetchGeolocationCountry(): Promise<string> {
  const location = await Engine.context.GeolocationController.getGeolocation();
  const alpha2 = (location ?? '').split('-')[0].toUpperCase();
  if (!alpha2 || alpha2 === 'UNKNOWN') {
    throw new Error(
      `Unable to determine country from geolocation (got "${location}").`,
    );
  }
  const alpha3 = alpha2ToAlpha3(alpha2);
  if (!alpha3) {
    throw new Error(
      `Unable to map country code "${alpha2}" to an ISO 3166-1 alpha-3 code.`,
    );
  }
  return alpha3;
}

// ---------------------------------------------------------------------------
// Step 0 — Fetch disclaimers (delegated to the local UKYC service)
// ---------------------------------------------------------------------------

export interface Disclaimer {
  id: string;
  display_name: string;
  url: string;
  [key: string]: unknown;
}

export type DisclaimersResponse = Disclaimer[];

export interface FetchDisclaimersParams {
  // ISO 3166-1 alpha-3 country code. Required.
  country: string;
}

/**
 * GET /vendors/moonpay/disclaimers?country={country}
 *
 * Fetches the disclaimers / terms content that must be shown to the customer
 * before they accept MoonPay's Terms of Use. The request is authenticated
 * with the wallet's identity bearer token from the `AuthenticationController`.
 */
export async function fetchDisclaimers(
  params: FetchDisclaimersParams,
): Promise<DisclaimersResponse> {
  const bearerToken = await getBearerToken();

  const url = new URL(`${UKYC_API_BASE_URL}/vendors/moonpay/disclaimers`);
  url.searchParams.set('country', params.country);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bearerToken}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `GET /vendors/moonpay/disclaimers failed (${response.status}): ${errorBody}`,
    );
  }

  return (await response.json()) as DisclaimersResponse;
}

// ---------------------------------------------------------------------------
// Step 2 — Create a session (delegated to the local UKYC service)
// ---------------------------------------------------------------------------

export interface CreateSessionParams {
  email: string;
  // ISO 8601 timestamp captured from the customer's Terms-of-Use acceptance.
  // No more than 60 seconds in the future. No past limit.
  termsAcceptedAt: string;
  // IDs of the disclaimers shown to (and accepted by) the customer. Sourced
  // from the `id` field of each entry in the disclaimers response.
  disclaimerIds: string[];
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
 *
 * The request is authenticated with the wallet's identity bearer token from
 * the `AuthenticationController` (the same token used for profile sync and
 * other authenticated MetaMask backend calls).
 */
export async function createSession(
  params: CreateSessionParams,
): Promise<CreateSessionResponse> {
  const bearerToken = await getBearerToken();

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
// Identity resource types (subset kept for downstream consumers)
// ---------------------------------------------------------------------------

export interface IdentityCapability {
  product: 'ramps';
}

export interface AddressSubmission {
  country?: string; // ISO 3166-1 alpha-3
}

export interface IdentitySubmission {
  residentialAddress?: AddressSubmission;
}

// ---------------------------------------------------------------------------
// Step 4 — Check whether KYC is required (delegated to the local UKYC service)
// ---------------------------------------------------------------------------

export interface KycRequiredParams {
  // MoonPay access token obtained from the Check/Auth frame.
  accessToken: string;
  // ISO 3166-1 alpha-3 country code. Required.
  country: string;
  capabilities?: IdentityCapability[];
}

export interface KycRequiredResponse {
  // Whether the customer still needs to complete KYC for the requested
  // capabilities in the given country.
  kycRequired: boolean;
  [key: string]: unknown;
}

/**
 * POST /vendors/moonpay/kyc-required
 *
 * Asks the local Universal KYC service whether KYC is required for the given
 * MoonPay access token, country, and capabilities. The request is
 * authenticated with the wallet's identity bearer token from the
 * `AuthenticationController`; the MoonPay `accessToken` is passed in the body.
 */
export async function checkKycRequired(
  params: KycRequiredParams,
): Promise<KycRequiredResponse> {
  const bearerToken = await getBearerToken();

  const response = await fetch(
    `${UKYC_API_BASE_URL}/vendors/moonpay/kyc-required`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bearerToken}`,
      },
      body: JSON.stringify({
        accessToken: params.accessToken,
        country: params.country,
        capabilities: params.capabilities ?? [{ product: 'ramps' }],
      }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `POST /vendors/moonpay/kyc-required failed (${response.status}): ${errorBody}`,
    );
  }

  return (await response.json()) as KycRequiredResponse;
}
