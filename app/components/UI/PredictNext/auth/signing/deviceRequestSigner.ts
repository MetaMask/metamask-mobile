import { sha256 } from '@noble/hashes/sha2';

import {
  coveredComponents,
  type VenueSigningProfile,
} from '../venueSigningProfiles';
import type { RenderedRequest } from './venueTemplates';

/** One entry of `signatures` in the `Venue-Authorization` envelope. */
export interface DeviceSignature {
  requestId: string;
  signatureInput: string;
  signature: string;
}

/** Phone-owned values for one signing pass. */
export interface DeviceSigningContext {
  a2t: string;
  /** Device public key, unpadded base64url. */
  deviceKey: string;
  /** Device salt, unpadded base64url. */
  salt: string;
}

export interface DeviceSignerDependencies {
  sign: (message: Uint8Array) => Promise<Uint8Array>;
  requestId: () => string;
  /** Unix time in seconds. */
  now: () => number;
}

/** `Content-Digest` (RFC 9530) of the exact body bytes, standard base64. */
export const contentDigest = (body: string): string =>
  `sha-256=:${Buffer.from(sha256(new TextEncoder().encode(body))).toString(
    'base64',
  )}:`;

const signatureParams = (
  profile: VenueSigningProfile,
  request: RenderedRequest,
  requestId: string,
  created: number,
): string => {
  const { lifetimeSec, tag } = profile.implementation.params;
  const covered = coveredComponents(profile, request.method)
    .map((component) => `"${component}"`)
    .join(' ');
  return `(${covered});created=${created};expires=${
    created + lifetimeSec
  };nonce="${requestId}";tag="${tag}"`;
};

/**
 * RFC 9421 signing base for one rendered request. The phone builds every line
 * from the request it rendered, the pinned profile and its own session. It
 * never signs a base it did not build.
 */
export const deviceSigningBase = (input: {
  profile: VenueSigningProfile;
  request: RenderedRequest;
  context: DeviceSigningContext;
  requestId: string;
  signatureParams: string;
}): string => {
  const { profile, request, context } = input;
  const { authority, headers, tokenScheme } = profile.implementation.params;
  const lines = [
    `"@method": ${request.method}`,
    `"@authority": ${authority}`,
    `"@path": ${request.path}`,
    `"@query": ?${request.query}`,
    `"authorization": ${tokenScheme} ${context.a2t}`,
    `"${headers.requestId}": ${input.requestId}`,
    `"${headers.key}": ${context.deviceKey}`,
    `"${headers.salt}": ${context.salt}`,
  ];
  if (request.method !== 'GET') {
    lines.push(
      `"content-digest": ${contentDigest(request.body)}`,
      '"content-type": application/json',
      `"idempotency-key": ${request.idempotencyKey ?? ''}`,
    );
  }
  lines.push(`"@signature-params": ${input.signatureParams}`);
  return lines.join('\n');
};

/** Signs one rendered request. */
export const signDeviceRequest = async (
  profile: VenueSigningProfile,
  request: RenderedRequest,
  context: DeviceSigningContext,
  deps: DeviceSignerDependencies,
): Promise<DeviceSignature> => {
  const requestId = deps.requestId();
  const params = signatureParams(profile, request, requestId, deps.now());
  const base = deviceSigningBase({
    profile,
    request,
    context,
    requestId,
    signatureParams: params,
  });
  const raw = await deps.sign(new TextEncoder().encode(base));
  const { label } = profile.implementation.params;
  return {
    requestId,
    signatureInput: `${label}=${params}`,
    signature: `${label}=:${Buffer.from(raw).toString('base64')}:`,
  };
};
