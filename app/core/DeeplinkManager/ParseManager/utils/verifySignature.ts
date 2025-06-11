import QuickCrypto from 'react-native-quick-crypto';
import {
  AnyAlgorithm,
  SubtleAlgorithm,
} from 'react-native-quick-crypto/lib/typescript/src/keys';

function base64StringToBytes(unpaddedBase64: string) {
  let standardB64 = unpaddedBase64.replace(/-/gu, '+').replace(/_/gu, '/');
  const pad = standardB64.length % 4;
  if (pad === 2) {
    standardB64 += '==';
  } else if (pad === 3) {
    standardB64 += '=';
  }

  const buffer = Buffer.from(standardB64, 'base64');
  return new Uint8Array(buffer);
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
  key: AnyAlgorithm;
};

async function lazyGetTools() {
  if (tools) {
    return tools;
  }
  const curve = 'P-256';
  const algorithm = { name: 'ECDSA', hash: 'SHA-256' } as const;

  const key = await QuickCrypto.webcrypto.subtle.importKey(
    'jwk',
    {
      crv: curve,
      ext: true,
      key_ops: ['verify'],
      kty: 'EC',
      x: 'Bhp73TQ0keNmZWmdPlT7U3dbqbvZRdywIe5RpVFwIuk',
      y: '4BFtBenx-ZjECrt6YUNRk4isSBTAFMn_21vDiFgI7h8',
    },
    algorithm,
    false,
    ['verify'],
  );

  tools = {
    algorithm,
    encoder: new TextEncoder(),
    key,
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
    const signature = base64StringToBytes(signatureStr);

    if (signature.length !== 64) {
      console.error(
        '❌ Invalid signature length:',
        signature.length,
        '(expected 64)',
      );
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
    console.error('💥 Error during signature verification:', error);
    return INVALID;
  }
};

export const hasSignature = (url: URL): boolean => url.searchParams.has('sig');
