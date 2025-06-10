import QuickCrypto from 'react-native-quick-crypto';

const { subtle } = QuickCrypto.webcrypto;

function base64StringToBytes(unpaddedBase64: string) {
  let standardB64 = unpaddedBase64.replace(/-/gu, '+').replace(/_/gu, '/');
  // Add padding if needed
  const pad = standardB64.length % 4;
  if (pad === 2) {
    standardB64 += '==';
  } else if (pad === 3) {
    standardB64 += '=';
  }

  // Decode to bytes - using Buffer for React Native compatibility
  const buffer = Buffer.from(standardB64, 'base64');
  return new Uint8Array(buffer);
}

function canonicalize(url: URL): string {
  console.log('  🔄 Original URL:', url.toString());
  
  // delete params so we don't edit the original URL
  const params = new URLSearchParams(url.searchParams);
  console.log('  📋 Original params:', Array.from(params.entries()));
  
  params.delete('sig');
  console.log('  ✂️  After removing sig:', Array.from(params.entries()));
  
  params.sort();
  console.log('  📊 After sorting:', Array.from(params.entries()));
  
  const queryString = params.toString();
  console.log('  🔗 Query string:', queryString);
  
  const fullUrl =
    url.origin + url.pathname + (queryString ? `?${queryString}` : '');
  console.log('  🎯 Canonicalized URL:', fullUrl);
  
  return fullUrl;
}

export const MISSING = 'MISSING' as const;
export const VALID = 'VALID' as const;
export const INVALID = 'INVALID' as const;

type VerificationResult = typeof MISSING | typeof VALID | typeof INVALID;

// Use any for crypto types to avoid conflicts between web crypto and react-native-quick-crypto
let tools: { algorithm: any; encoder: TextEncoder; key: any };

async function lazyGetTools() {
  if (tools) {
    return tools;
  }
  const curve = 'P-256';
  const algorithm = { name: 'ECDSA', hash: 'SHA-256' };
  const keyUsage = ['verify'];
  
  const key = await subtle.importKey(
    'jwk',
    {
      crv: curve,
      ext: true,
      key_ops: keyUsage,
      kty: 'EC',
      x: 'Bhp73TQ0keNmZWmdPlT7U3dbqbvZRdywIe5RpVFwIuk',
      y: '4BFtBenx-ZjECrt6YUNRk4isSBTAFMn_21vDiFgI7h8',
    },
    { name: algorithm.name, namedCurve: curve },
    false, // extractable
    keyUsage,
  );

  tools = {
    algorithm,
    encoder: new TextEncoder(),
    key,
  };
  return tools;
}

export const verifyDeeplinkSignature = async (url: URL): Promise<VerificationResult> => {
  console.log('🔍 Starting signature verification for URL:', url.toString());
  
  const signatureStr = url.searchParams.get('sig');
  if (!signatureStr) {
    console.log('📝 No signature parameter found in URL');
    return MISSING;
  }
  
  console.log('🔑 Found signature parameter:', signatureStr);
  
  try {
    console.log('🔧 Decoding base64url signature...');
    const signature = base64StringToBytes(signatureStr);
    console.log('📏 Decoded signature length:', signature.length, 'bytes');

    if (signature.length !== 64) {
      console.error('❌ Invalid signature length:', signature.length, '(expected 64)');
      return INVALID;
    }

    console.log('🔨 Getting crypto tools...');
    const { algorithm, encoder, key } = await lazyGetTools();
    console.log('✅ Crypto tools initialized');

    console.log('🔄 Canonicalizing URL...');
    const canonicalUrl = canonicalize(url);
    console.log('📋 Canonical URL:', canonicalUrl);
    
    console.log('📝 Encoding canonical URL for verification...');
    const data = encoder.encode(canonicalUrl);
    console.log('📊 Data to verify length:', data.length, 'bytes');

    console.log('🔐 Performing cryptographic verification...');
    const ok = await subtle.verify(algorithm, key, signature, data);
    console.log('🎯 Verification result:', ok ? 'VALID' : 'INVALID');
    
    return ok ? VALID : INVALID;
  } catch (error) {
    console.error('💥 Error during signature verification:', error);
    return INVALID;
  }
};

// Utility function to check if a URL has a signature parameter
export const hasSignature = (url: URL): boolean => {
  return url.searchParams.has('sig');
};

// Utility function to get signature verification result with logging
export const verifyDeeplinkWithLogging = async (url: URL, origin: string): Promise<VerificationResult> => {
  const result = await verifyDeeplinkSignature(url);
  
  if (result === INVALID) {
    console.log(`Invalid signature for deeplink from ${origin}:`, url.toString());
  } else if (result === VALID) {
    console.log(`Valid signature verified for deeplink from ${origin}`);
  }
  
  return result;
}; 