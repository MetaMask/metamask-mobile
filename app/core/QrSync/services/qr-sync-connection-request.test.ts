import { parseQrSyncConnectionRequest } from './qr-sync-connection-request';

const createSessionRequestPayload = (expiresAt: number) => ({
  id: '07f5927c-1ead-490d-8741-bcbcf022ca6d',
  mode: 'untrusted',
  channel: 'handshake:07f5927c-1ead-490d-8741-bcbcf022ca6d',
  publicKeyB64: 'Ain3xX9VVHwFio0cQMRAt1ZKxfEVTTimuI/AwAvpeevI',
  expiresAt,
  initialMessage: {
    type: 'message',
    payload: {
      type: 'init-sync-session',
      version: '1.0.0',
    },
  },
});

describe('parseQrSyncConnectionRequest', () => {
  const futureExpiresAt = Date.now() + 60_000;
  const sessionRequest = createSessionRequestPayload(futureExpiresAt);
  const base64Payload = Buffer.from(JSON.stringify(sessionRequest)).toString(
    'base64',
  );
  const deeplink = `metamask://connect/mwp?p=${base64Payload}`;

  it('parses a full MWP deeplink with a base64-encoded session request', () => {
    const result = parseQrSyncConnectionRequest(deeplink);

    expect(result.sessionRequest.id).toBe(sessionRequest.id);
    expect(result.sessionRequest.channel).toBe(sessionRequest.channel);
  });

  it('parses a raw base64-encoded session request', () => {
    const result = parseQrSyncConnectionRequest(base64Payload);

    expect(result.sessionRequest.id).toBe(sessionRequest.id);
  });

  it('parses a raw JSON session request', () => {
    const result = parseQrSyncConnectionRequest(JSON.stringify(sessionRequest));

    expect(result.sessionRequest.id).toBe(sessionRequest.id);
  });

  it('throws when the deeplink payload is not valid JSON', () => {
    expect(() =>
      parseQrSyncConnectionRequest('metamask://connect/mwp?p=not-json'),
    ).toThrow('QR sync scan payload is not valid JSON.');
  });

  it('throws when the session request is expired', () => {
    const expiredPayload = Buffer.from(
      JSON.stringify(createSessionRequestPayload(Date.now() - 1_000)),
    ).toString('base64');

    expect(() =>
      parseQrSyncConnectionRequest(
        `metamask://connect/mwp?p=${expiredPayload}`,
      ),
    ).toThrow('QR sync scan payload does not contain a valid session request.');
  });
});
