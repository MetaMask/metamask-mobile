import crypto from 'node:crypto';

/**
 * Kalshi API-key signing recipe (see ISV spec §3):
 *   pre_sign = <timestamp_ms> + <HTTP_METHOD> + <REQUEST_PATH>
 *   signature = base64(RSA-PSS-SHA256(pre_sign, private_key, saltLength = 32))
 *
 * REQUEST_PATH is the URL path only — no host, no query string in the pre-image.
 * The PEM may be a PKCS#1 ("BEGIN RSA PRIVATE KEY") or PKCS#8 ("BEGIN PRIVATE KEY") block.
 */
export interface SignedHeaders {
  'KALSHI-ACCESS-KEY': string;
  'KALSHI-ACCESS-SIGNATURE': string;
  'KALSHI-ACCESS-TIMESTAMP': string;
}

export function signRequest(params: {
  apiKeyId: string;
  pem: string;
  method: string;
  path: string;
  /** Override for tests; defaults to Date.now(). */
  timestampMs?: number;
}): SignedHeaders {
  const ts = String(params.timestampMs ?? Date.now());
  const preSign = ts + params.method.toUpperCase() + params.path;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(preSign);
  signer.end();
  const signature = signer.sign(
    {
      key: params.pem,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
    },
    'base64',
  );
  return {
    'KALSHI-ACCESS-KEY': params.apiKeyId,
    'KALSHI-ACCESS-SIGNATURE': signature,
    'KALSHI-ACCESS-TIMESTAMP': ts,
  };
}
