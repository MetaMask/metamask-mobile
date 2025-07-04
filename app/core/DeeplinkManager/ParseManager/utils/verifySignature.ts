import QuickCrypto from 'react-native-quick-crypto';
import {
  CryptoKey,
  SubtleAlgorithm,
} from 'react-native-quick-crypto/lib/typescript/src/keys';
import { toByteArray } from 'react-native-quick-base64'; // Import the Base64 decoding function
import AppConstants from '../../../../core/AppConstants';

function normalizeBase64(base64String: string): string {
  // Normalize URL-safe Base64
  const standardBase64 = base64String.replace(/-/g, '+').replace(/_/g, '/');

  // Add padding if necessary
  const pad = standardBase64.length % 4;
  if (pad === 2) {
    return standardBase64 + '==';
  } else if (pad === 3) {
    return standardBase64 + '=';
  }
  return standardBase64;
}

function getKeyData() {
  return {
    crv: 'P-256' as const,
    ext: true,
    key_ops: ['verify' as const],
    kty: 'EC' as const,
    x: AppConstants.MM_DEEP_LINK_PUBLIC_KEY_X,
    y: AppConstants.MM_DEEP_LINK_PUBLIC_KEY_Y,
  };
}

function canonicalize(url: URL): string {
  const params = new URLSearchParams(url.searchParams);

  params.delete('sig');

  params.sort();

  const queryString = params.toString();

  const fullUrl =
    url.origin + url.pathname + (queryString ? `?${queryString}` : '');

  return fullUrl;
}

export const MISSING = 'MISSING' as const;
export const VALID = 'VALID' as const;
export const INVALID = 'INVALID' as const;

type VerificationResult = typeof MISSING | typeof VALID | typeof INVALID;

let tools: {
  algorithm: SubtleAlgorithm;
  encoder: TextEncoder;
  key: CryptoKey;
};

async function lazyGetTools() {
  if (tools) {
    return tools;
  }

  const algorithm = {
    name: 'ECDSA',
    hash: 'SHA-256',
    namedCurve: 'P-256',
  } as const;

  const key = await QuickCrypto.webcrypto.subtle.importKey(
    'jwk',
    getKeyData(),
    algorithm,
    false,
    ['verify'],
  );

  tools = {
    algorithm,
    encoder: new TextEncoder(),
    key: key as CryptoKey,
  };
  return tools;
}

export const verifyDeeplinkSignature = async (
  url: URL,
): Promise<VerificationResult> => {
  const signatureStr = url.searchParams.get('sig');
  if (!signatureStr) {
    return MISSING;
  }

  try {
    // Normalize and decode the Base64 string
    const normalizedBase64 = normalizeBase64(signatureStr);
    const signature = toByteArray(normalizedBase64);

    if (signature.length !== 64) {
      return INVALID;
    }

    const { algorithm, encoder, key } = await lazyGetTools();

    const canonicalUrl = canonicalize(url);

    const data = encoder.encode(canonicalUrl);

    const ok = await QuickCrypto.webcrypto.subtle.verify(
      algorithm,
      key,
      signature,
      data,
    );
    return ok ? VALID : INVALID;
  } catch (error) {
    return INVALID;
  }
};

export const hasSignature = (url: URL): boolean => url.searchParams.has('sig');
