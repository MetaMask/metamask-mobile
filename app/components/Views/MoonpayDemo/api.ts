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

// ---------------------------------------------------------------------------
// Endpoint configuration
// ---------------------------------------------------------------------------

// Android emulator uses 10.0.2.2 to reach the host machine's localhost.
export const UKYC_API_BASE_URL = 'http://192.168.1.95:3000';
// export const UKYC_API_BASE_URL = Platform.select({
//   android: 'http://localhost:3000',
//   ios: 'http://192.168.1.95:3000',
//   default: 'http://localhost:3000',
//}) as string;

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
