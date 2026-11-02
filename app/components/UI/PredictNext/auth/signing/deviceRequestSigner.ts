import {
  coveredComponents,
  type VenueSigningProfile,
} from '../venueSigningProfiles';
import { contentDigest, type VenueRequest } from './venueRequest';

/** One entry of `signatures` in the device-auth envelope. */
export interface DeviceSignature {
  method: 'GET' | 'POST';
  path: string;
  query: string;
  contentDigest?: string;
  idempotencyKey?: string;
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

const signatureParams = (
  profile: VenueSigningProfile,
  method: VenueRequest['method'],
  requestId: string,
  created: number,
): string => {
  const covered = coveredComponents(profile, method)
    .map((component) => `"${component}"`)
    .join(' ');
  return `(${covered});created=${created};expires=${
    created + profile.signature.lifetimeSec
  };nonce="${requestId}";tag="${profile.signature.tag}"`;
};

/**
 * RFC 9421 signing base for one request. The phone builds every line from
 * the checked request, the pinned profile and its own session. It never
 * signs a server-supplied base.
 */
export const deviceSigningBase = (input: {
  profile: VenueSigningProfile;
  request: VenueRequest;
  context: DeviceSigningContext;
  requestId: string;
  signatureParams: string;
}): string => {
  const { profile, request, context } = input;
  const { headers, tokenScheme } = profile.signature;
  const lines = [
    `"@method": ${request.method}`,
    `"@authority": ${profile.authority}`,
    `"@path": ${request.path}`,
    `"@query": ?${request.query}`,
    `"authorization": ${tokenScheme} ${context.a2t}`,
    `"${headers.requestId}": ${input.requestId}`,
    `"${headers.key}": ${context.deviceKey}`,
    `"${headers.salt}": ${context.salt}`,
  ];
  if (request.method === 'POST') {
    lines.push(
      `"content-digest": ${contentDigest(request.body ?? '')}`,
      '"content-type": application/json',
      `"idempotency-key": ${request.idempotencyKey ?? ''}`,
    );
  }
  lines.push(`"@signature-params": ${input.signatureParams}`);
  return lines.join('\n');
};

/** Signs one request the signing policy accepted. */
export const signDeviceRequest = async (
  profile: VenueSigningProfile,
  request: VenueRequest,
  context: DeviceSigningContext,
  deps: DeviceSignerDependencies,
): Promise<DeviceSignature> => {
  const requestId = deps.requestId();
  const params = signatureParams(
    profile,
    request.method,
    requestId,
    deps.now(),
  );
  const base = deviceSigningBase({
    profile,
    request,
    context,
    requestId,
    signatureParams: params,
  });
  const raw = await deps.sign(new TextEncoder().encode(base));
  const { label } = profile.signature;
  const signature: DeviceSignature = {
    method: request.method,
    path: request.path,
    query: request.query,
    requestId,
    signatureInput: `${label}=${params}`,
    signature: `${label}=:${Buffer.from(raw).toString('base64')}:`,
  };
  if (request.method === 'POST') {
    signature.contentDigest = contentDigest(request.body ?? '');
    signature.idempotencyKey = request.idempotencyKey;
  }
  return signature;
};
