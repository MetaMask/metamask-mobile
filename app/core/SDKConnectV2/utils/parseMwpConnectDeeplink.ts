import { decompressPayloadB64 } from './compression-utils';

/**
 * Parses the raw JSON payload from an MWP connect deeplink.
 *
 * Format: metamask://connect/mwp?p=<encoded_connection_request>&c=1
 */
export const parseMwpConnectPayload = (url: string): unknown => {
  const parsed = new URL(url);

  const payload = parsed.searchParams.get('p');
  if (!payload) {
    throw new Error('No payload found in URL.');
  }

  if (payload.length > 1024 * 1024) {
    throw new Error('Payload too large (max 1MB).');
  }

  const compressionFlag = parsed.searchParams.get('c');
  const jsonString =
    compressionFlag === '1' ? decompressPayloadB64(payload) : payload;

  if (jsonString.length > 1024 * 1024) {
    throw new Error('Decompressed payload too large (max 1MB).');
  }

  return JSON.parse(jsonString);
};
