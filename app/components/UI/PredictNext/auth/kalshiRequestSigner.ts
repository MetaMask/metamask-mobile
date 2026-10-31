import {
  coveredComponents,
  kalshiContentDigest,
  type VenueRequest,
} from './signing/venueRequest';

/** Seconds a device signature stays valid. */
export const KALSHI_SIGNATURE_LIFETIME_SEC = 60;

const SIGNATURE_TAG = 'kalshi-device-request-v1';

/** One entry of `signatures` in the `Kalshi-Device-Auth` envelope. */
export interface KalshiDeviceSignature {
  method: 'GET' | 'POST';
  path: string;
  query: string;
  contentDigest?: string;
  idempotencyKey?: string;
  requestId: string;
  signatureInput: string;
  signature: string;
}

export interface KalshiSigningContext {
  authority: string;
  a2t: string;
  /** Device public key, unpadded base64url. */
  deviceKey: string;
  /** Device salt, unpadded base64url. */
  salt: string;
}

export interface KalshiSignerDependencies {
  sign: (message: Uint8Array) => Promise<Uint8Array>;
  requestId: () => string;
  /** Unix time in seconds. */
  now: () => number;
}

const signatureParams = (
  request: VenueRequest,
  requestId: string,
  created: number,
): string => {
  const covered = coveredComponents(request)
    .map((component) => `"${component}"`)
    .join(' ');
  return `(${covered});created=${created};expires=${
    created + KALSHI_SIGNATURE_LIFETIME_SEC
  };nonce="${requestId}";tag="${SIGNATURE_TAG}"`;
};

/**
 * RFC 9421 signing base for one Kalshi call (ISV spec Appendix B). Every
 * line comes from the phone's own request and session, never from a
 * server-supplied base.
 */
export const kalshiSigningBase = (input: {
  request: VenueRequest;
  context: KalshiSigningContext;
  requestId: string;
  signatureParams: string;
}): string => {
  const { request, context } = input;
  const lines = [
    `"@method": ${request.method}`,
    `"@authority": ${context.authority}`,
    `"@path": ${request.path}`,
    `"@query": ?${request.query}`,
    `"authorization": Kalshi-A2T ${context.a2t}`,
    `"kalshi-device-request-id": ${input.requestId}`,
    `"kalshi-device-key": ${context.deviceKey}`,
    `"kalshi-device-key-salt": ${context.salt}`,
  ];
  if (request.method === 'POST') {
    lines.push(
      `"content-digest": ${kalshiContentDigest(request.body ?? '')}`,
      '"content-type": application/json',
      `"idempotency-key": ${request.idempotencyKey ?? ''}`,
    );
  }
  lines.push(`"@signature-params": ${input.signatureParams}`);
  return lines.join('\n');
};

/** Signs one phone-built request. There is no "sign these bytes" export. */
export const signVenueRequest = async (
  request: VenueRequest,
  context: KalshiSigningContext,
  deps: KalshiSignerDependencies,
): Promise<KalshiDeviceSignature> => {
  const requestId = deps.requestId();
  const params = signatureParams(request, requestId, deps.now());
  const base = kalshiSigningBase({
    request,
    context,
    requestId,
    signatureParams: params,
  });
  const raw = await deps.sign(new TextEncoder().encode(base));
  const signature: KalshiDeviceSignature = {
    method: request.method,
    path: request.path,
    query: request.query,
    requestId,
    signatureInput: `kalshi=${params}`,
    signature: `kalshi=:${Buffer.from(raw).toString('base64')}:`,
  };
  if (request.method === 'POST') {
    signature.contentDigest = kalshiContentDigest(request.body ?? '');
    signature.idempotencyKey = request.idempotencyKey;
  }
  return signature;
};
