import { decompressPayloadB64 } from './compression-utils';

const MAX_MWP_PAYLOAD_BYTES = 1024 * 1024;

const decodeUncompressedMwpPayload = (payload: string): string => {
  const trimmed = payload.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return payload;
  }

  try {
    const decoded = Buffer.from(payload, 'base64').toString('utf-8');
    const decodedTrimmed = decoded.trim();
    if (decodedTrimmed.startsWith('{') || decodedTrimmed.startsWith('[')) {
      return decoded;
    }
  } catch {
    // Fall through and return the raw payload below.
  }

  return payload;
};

/**
 * Extracts the JSON string from an MWP connect deeplink before parsing.
 *
 * Format: metamask://connect/mwp?p=<encoded_connection_request>&c=1
 */
export const extractMwpConnectJsonString = (url: string): string => {
  const parsed = new URL(url);

  const payload = parsed.searchParams.get('p');
  if (!payload) {
    throw new Error('No payload found in URL.');
  }

  if (payload.length > MAX_MWP_PAYLOAD_BYTES) {
    throw new Error('Payload too large (max 1MB).');
  }

  const compressionFlag = parsed.searchParams.get('c');
  const jsonString =
    compressionFlag === '1'
      ? decompressPayloadB64(payload)
      : decodeUncompressedMwpPayload(payload);

  if (jsonString.length > MAX_MWP_PAYLOAD_BYTES) {
    throw new Error('Decompressed payload too large (max 1MB).');
  }

  return jsonString;
};

/**
 * Parses the raw JSON payload from an MWP connect deeplink.
 *
 * Format: metamask://connect/mwp?p=<encoded_connection_request>&c=1
 */
export const parseMwpConnectPayload = (url: string): unknown => JSON.parse(extractMwpConnectJsonString(url));
