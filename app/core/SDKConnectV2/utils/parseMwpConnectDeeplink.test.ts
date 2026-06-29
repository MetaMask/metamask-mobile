import {
  extractMwpConnectJsonString,
  parseMwpConnectPayload,
} from './parseMwpConnectDeeplink';

describe('parseMwpConnectDeeplink', () => {
  const jsonPayload = JSON.stringify({
    id: '07f5927c-1ead-490d-8741-bcbcf022ca6d',
    mode: 'untrusted',
  });
  const base64Payload = Buffer.from(jsonPayload).toString('base64');

  it('extracts JSON from an uncompressed base64 payload', () => {
    const deeplink = `metamask://connect/mwp?p=${base64Payload}`;

    expect(extractMwpConnectJsonString(deeplink)).toBe(jsonPayload);
    expect(parseMwpConnectPayload(deeplink)).toEqual(JSON.parse(jsonPayload));
  });

  it('extracts JSON from an uncompressed raw JSON payload', () => {
    const deeplink = `metamask://connect/mwp?p=${encodeURIComponent(jsonPayload)}`;

    expect(extractMwpConnectJsonString(deeplink)).toBe(jsonPayload);
    expect(parseMwpConnectPayload(deeplink)).toEqual(JSON.parse(jsonPayload));
  });
});
