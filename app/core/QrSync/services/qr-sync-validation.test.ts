import type { SessionRequest } from '@metamask/mobile-wallet-protocol-core';
import { deflate } from 'pako';

import { QrSyncActionTypes, QrSyncMessageVersion } from '../constants';
import type { QrSyncMessage, QrSyncReadyPayload } from '../types';
import {
  isQrSyncMwpDeeplink,
  isQrSyncSessionRequest,
  parseQrSyncConnectionRequest,
  parseQrSyncSyncReadyMessage,
  QR_SYNC_MWP_DEEPLINK_PREFIX,
  validateQrSyncSecretImportsForOnboarding,
} from './qr-sync-validation';

const VALID_SESSION_ID = '11111111-2222-3333-4444-555555555555';
const VALID_CHANNEL = 'handshake:aabbccdd-1122-3344-5566-778899aabbcc';
/** Base64-encoded 33-byte compressed public key. */
const VALID_PUBLIC_KEY_B64 = 'AoBDLWxRbJNe8yUv5bmmoVnNo8DCilzbFz/nWD+RKC2V';
const FIXED_NOW = 1_700_000_000_000;
const FUTURE_DEADLINE = FIXED_NOW + 60_000;

const encodeSecret = (plaintext: string): string =>
  Buffer.from(plaintext, 'utf-8').toString('base64');

const encodeBase64Json = (value: unknown): string =>
  Buffer.from(JSON.stringify(value), 'utf-8').toString('base64');

const compressAndEncode = (data: string): string => {
  const compressed = deflate(new TextEncoder().encode(data));
  return Buffer.from(compressed).toString('base64');
};

const createMwpDeeplink = (
  payload: string,
  options: { compressed?: boolean } = {},
): string => {
  const query = options.compressed
    ? `p=${encodeURIComponent(payload)}&c=1`
    : `p=${encodeURIComponent(payload)}`;

  return `${QR_SYNC_MWP_DEEPLINK_PREFIX}?${query}`;
};

const createSessionRequest = (
  overrides: Partial<SessionRequest> = {},
): SessionRequest => ({
  id: VALID_SESSION_ID,
  publicKeyB64: VALID_PUBLIC_KEY_B64,
  channel: VALID_CHANNEL,
  mode: 'trusted',
  expiresAt: Date.now() + 600_000,
  ...overrides,
});

const createWireImportPayload = (
  overrides: Partial<QrSyncReadyPayload> = {},
): QrSyncReadyPayload => ({
  version: 1,
  deadline: FUTURE_DEADLINE,
  data: [
    {
      type: 'Mnemonic',
      mnemonic: encodeSecret('word1 word2 word3'),
      name: 'Wallet 1',
      isPrimary: true,
      groups: [{ groupIndex: 0, name: 'Account 1' }],
    },
  ],
  ...overrides,
});

const createSyncReadyMessage = (
  overrides: Partial<QrSyncMessage<QrSyncReadyPayload>> = {},
): QrSyncMessage<QrSyncReadyPayload> => ({
  type: QrSyncActionTypes.SYNC_READY,
  version: QrSyncMessageVersion.V1,
  data: createWireImportPayload(),
  ...overrides,
});

describe('qr-sync-validation', () => {
  describe('isQrSyncMwpDeeplink', () => {
    it('returns true for metamask://connect/mwp deeplinks', () => {
      const deeplink = createMwpDeeplink('payload');

      const result = isQrSyncMwpDeeplink(deeplink);

      expect(result).toBe(true);
    });

    it('returns false for non-deeplink strings', () => {
      expect(isQrSyncMwpDeeplink('{"sessionRequest":{}}')).toBe(false);
      expect(isQrSyncMwpDeeplink('metamask://other')).toBe(false);
    });
  });

  describe('parseQrSyncConnectionRequest', () => {
    it('parses metamask://connect/mwp deeplinks with base64 p parameter', () => {
      const sessionRequest = createSessionRequest();
      const deeplink = createMwpDeeplink(encodeBase64Json(sessionRequest));

      const result = parseQrSyncConnectionRequest(deeplink);

      expect(result).toEqual({ sessionRequest });
    });

    it('parses metamask://connect/mwp deeplinks with plain JSON p parameter', () => {
      const sessionRequest = createSessionRequest();
      const deeplink = createMwpDeeplink(JSON.stringify(sessionRequest));

      const result = parseQrSyncConnectionRequest(deeplink);

      expect(result).toEqual({ sessionRequest });
    });

    it('parses metamask://connect/mwp deeplinks with compressed p parameter', () => {
      const sessionRequest = createSessionRequest();
      const deeplink = createMwpDeeplink(
        compressAndEncode(encodeBase64Json(sessionRequest)),
        { compressed: true },
      );

      const result = parseQrSyncConnectionRequest(deeplink);

      expect(result).toEqual({ sessionRequest });
    });

    it('throws when metamask://connect/mwp deeplink is missing p parameter', () => {
      const deeplink = `${QR_SYNC_MWP_DEEPLINK_PREFIX}?c=1`;

      expect(() => parseQrSyncConnectionRequest(deeplink)).toThrow(
        'QR sync deeplink is missing the p parameter.',
      );
    });

    it('throws when raw QR data is empty', () => {
      expect(() => parseQrSyncConnectionRequest('')).toThrow(
        'QR sync scan payload must be a non-empty string.',
      );
    });

    it('throws when raw QR data is not an MWP deeplink', () => {
      expect(() => parseQrSyncConnectionRequest('not-json')).toThrow(
        'QR sync scan payload is not a valid MWP deeplink.',
      );
    });

    it('throws when JSON does not contain a session request', () => {
      const deeplink = createMwpDeeplink(encodeBase64Json({ foo: 'bar' }));

      expect(() => parseQrSyncConnectionRequest(deeplink)).toThrow(
        'QR sync scan payload does not contain a valid session request.',
      );
    });
  });

  describe('isQrSyncSessionRequest', () => {
    it('returns true for a complete, unexpired session request', () => {
      const sessionRequest = createSessionRequest();

      const result = isQrSyncSessionRequest(sessionRequest);

      expect(result).toBe(true);
    });

    it('returns false for non-object values', () => {
      expect(isQrSyncSessionRequest(null)).toBe(false);
      expect(isQrSyncSessionRequest('session')).toBe(false);
    });

    it('returns false when id is not a UUID', () => {
      const sessionRequest = createSessionRequest({ id: 'not-a-uuid' });

      const result = isQrSyncSessionRequest(sessionRequest);

      expect(result).toBe(false);
    });

    it('returns false when publicKeyB64 does not decode to 33 bytes', () => {
      const sessionRequest = createSessionRequest({
        publicKeyB64: Buffer.from('short-key').toString('base64'),
      });

      const result = isQrSyncSessionRequest(sessionRequest);

      expect(result).toBe(false);
    });

    it('returns false when channel is not a handshake channel', () => {
      const sessionRequest = createSessionRequest({
        channel: 'relay:some-channel',
      });

      const result = isQrSyncSessionRequest(sessionRequest);

      expect(result).toBe(false);
    });

    it('returns false when mode is not trusted or untrusted', () => {
      const sessionRequest = createSessionRequest({
        mode: 'unknown' as SessionRequest['mode'],
      });

      const result = isQrSyncSessionRequest(sessionRequest);

      expect(result).toBe(false);
    });

    it('returns false when expiresAt is in the past', () => {
      const sessionRequest = createSessionRequest({
        expiresAt: Date.now() - 1,
      });

      const result = isQrSyncSessionRequest(sessionRequest);

      expect(result).toBe(false);
    });
  });

  describe('parseQrSyncSyncReadyMessage', () => {
    it('maps mnemonic and private-key entries to secrets and provisioning metadata', () => {
      const plaintext = 'word1 word2 word3';
      const message = createSyncReadyMessage({
        data: createWireImportPayload({
          data: [
            {
              type: 'Mnemonic',
              mnemonic: encodeSecret(plaintext),
              name: 'Wallet 1',
              isPrimary: true,
              groups: [
                { groupIndex: 0, name: 'Account 1', pinned: true },
                { groupIndex: 1, name: 'Account 2' },
                { groupIndex: 2, name: 'Savings', hidden: true },
              ],
            },
            {
              type: 'PrivateKey',
              privateKey: encodeSecret('0xabc'),
              name: 'Imported Account 1',
            },
          ],
        }),
      });

      const result = parseQrSyncSyncReadyMessage(message, FIXED_NOW);

      expect(result).toEqual({
        valid: true,
        pendingSecretImports: [
          {
            index: 0,
            type: 'MNEMONIC',
            value: plaintext,
            isPrimary: true,
          },
          {
            index: 1,
            type: 'PRIVATE_KEY',
            value: '0xabc',
          },
        ],
        provisioningMetadata: {
          version: 1,
          entries: [
            {
              index: 0,
              type: 'MNEMONIC',
              isPrimary: true,
              name: 'Wallet 1',
              groups: [
                { groupIndex: 0, name: 'Account 1', pinned: true },
                { groupIndex: 1, name: 'Account 2' },
                { groupIndex: 2, name: 'Savings', hidden: true },
              ],
            },
            {
              index: 1,
              type: 'PRIVATE_KEY',
              name: 'Imported Account 1',
            },
          ],
        },
      });
    });

    it('treats omitted isPrimary as false on mnemonic entries', () => {
      const message = createSyncReadyMessage({
        data: createWireImportPayload({
          data: [
            {
              type: 'Mnemonic',
              mnemonic: 'word1 word2 word3',
              name: 'Wallet 1',
              groups: [{ groupIndex: 0, name: 'Account 1' }],
            },
            {
              type: 'Mnemonic',
              mnemonic: 'other seed phrase',
              name: 'Wallet 2',
              groups: [{ groupIndex: 0, name: 'Account 1' }],
            },
          ],
        }),
      });

      const result = parseQrSyncSyncReadyMessage(message, FIXED_NOW);

      expect(result.valid).toBe(true);
      if (!result.valid) {
        return;
      }

      expect(result.pendingSecretImports[0]?.isPrimary).toBe(false);
      expect(result.pendingSecretImports[1]?.isPrimary).toBe(false);
      expect(result.provisioningMetadata.entries[0]).toMatchObject({
        isPrimary: false,
        name: 'Wallet 1',
      });
      expect(result.provisioningMetadata.entries[1]).toMatchObject({
        isPrimary: false,
        name: 'Wallet 2',
      });
    });

    it('returns SESSION_EXPIRED when deadline is not after current time', () => {
      const result = parseQrSyncSyncReadyMessage(
        createSyncReadyMessage({
          data: createWireImportPayload({ deadline: FIXED_NOW }),
        }),
        FIXED_NOW,
      );

      expect(result).toEqual({
        valid: false,
        error: {
          code: 'SESSION_EXPIRED',
          message: 'QR sync payload deadline has expired.',
        },
      });
    });

    it('returns INVALID_PAYLOAD when more than one mnemonic is marked primary', () => {
      const result = parseQrSyncSyncReadyMessage(
        createSyncReadyMessage({
          data: createWireImportPayload({
            data: [
              {
                type: 'Mnemonic',
                mnemonic: encodeSecret('word1 word2 word3'),
                name: 'Wallet 1',
                isPrimary: true,
                groups: [{ groupIndex: 0, name: 'Account 1' }],
              },
              {
                type: 'Mnemonic',
                mnemonic: encodeSecret('other seed phrase'),
                name: 'Wallet 2',
                isPrimary: true,
                groups: [{ groupIndex: 0, name: 'Account 1' }],
              },
            ],
          }),
        }),
        FIXED_NOW,
      );

      expect(result).toEqual({
        valid: false,
        error: {
          code: 'INVALID_PAYLOAD',
          message: 'QR sync payload may include at most one primary mnemonic.',
        },
      });
    });

    it('returns INVALID_PAYLOAD when envelope type is not sync-ready', () => {
      const result = parseQrSyncSyncReadyMessage(
        {
          type: QrSyncActionTypes.SYNC_OFFER,
          version: QrSyncMessageVersion.V1,
          data: createWireImportPayload(),
        },
        FIXED_NOW,
      );

      expect(result).toEqual({
        valid: false,
        error: {
          code: 'INVALID_PAYLOAD',
          message: `Expected QR sync message type "${QrSyncActionTypes.SYNC_READY}".`,
        },
      });
    });

    it('returns INVALID_PAYLOAD when sync-ready data payload is malformed', () => {
      const result = parseQrSyncSyncReadyMessage(
        {
          type: QrSyncActionTypes.SYNC_READY,
          version: QrSyncMessageVersion.V1,
          data: {
            version: 1,
            deadline: FUTURE_DEADLINE,
            data: [],
          },
        },
        FIXED_NOW,
      );

      expect(result).toEqual({
        valid: false,
        error: {
          code: 'INVALID_PAYLOAD',
          message: 'QR sync payload must include at least one secret import.',
        },
      });
    });

    it('returns INVALID_PAYLOAD when an import entry has an unsupported type', () => {
      const result = parseQrSyncSyncReadyMessage(
        createSyncReadyMessage({
          data: createWireImportPayload({
            data: [
              {
                type: 'SeedPhrase',
                mnemonic: encodeSecret('word1 word2 word3'),
                name: 'Wallet 1',
                groups: [{ groupIndex: 0, name: 'Account 1' }],
              } as unknown as QrSyncReadyPayload['data'][number],
            ],
          }),
        }),
        FIXED_NOW,
      );

      expect(result).toEqual({
        valid: false,
        error: {
          code: 'INVALID_PAYLOAD',
          message: 'QR sync payload contains a malformed import entry.',
        },
      });
    });

    it('accepts mnemonic entries with omitted name, groups, and isPrimary', () => {
      const plaintext = 'word1 word2 word3';
      const message = createSyncReadyMessage({
        data: createWireImportPayload({
          data: [
            {
              type: 'Mnemonic',
              mnemonic: encodeSecret(plaintext),
            },
          ],
        }),
      });

      const result = parseQrSyncSyncReadyMessage(message, FIXED_NOW);

      expect(result).toEqual({
        valid: true,
        pendingSecretImports: [
          {
            index: 0,
            type: 'MNEMONIC',
            value: plaintext,
            isPrimary: false,
          },
        ],
        provisioningMetadata: {
          version: 1,
          entries: [
            {
              index: 0,
              type: 'MNEMONIC',
              isPrimary: false,
            },
          ],
        },
      });
    });

    it('returns INVALID_PAYLOAD when a mnemonic entry has an empty name', () => {
      const result = parseQrSyncSyncReadyMessage(
        createSyncReadyMessage({
          data: createWireImportPayload({
            data: [
              {
                type: 'Mnemonic',
                mnemonic: encodeSecret('word1 word2 word3'),
                name: '',
              },
            ],
          }),
        }),
        FIXED_NOW,
      );

      expect(result).toEqual({
        valid: false,
        error: {
          code: 'INVALID_PAYLOAD',
          message: 'QR sync payload contains a malformed import entry.',
        },
      });
    });

    it('returns INVALID_PAYLOAD when groups contains a malformed account group', () => {
      const result = parseQrSyncSyncReadyMessage(
        createSyncReadyMessage({
          data: createWireImportPayload({
            data: [
              {
                type: 'Mnemonic',
                mnemonic: encodeSecret('word1 word2 word3'),
                groups: [{ groupIndex: 0, name: '' }],
              },
            ],
          }),
        }),
        FIXED_NOW,
      );

      expect(result).toEqual({
        valid: false,
        error: {
          code: 'INVALID_PAYLOAD',
          message: 'QR sync payload contains a malformed import entry.',
        },
      });
    });

    it('returns INVALID_PAYLOAD when a private-key entry omits name', () => {
      const result = parseQrSyncSyncReadyMessage(
        createSyncReadyMessage({
          data: createWireImportPayload({
            data: [
              {
                type: 'PrivateKey',
                privateKey: encodeSecret('0xabc'),
                name: '',
              },
            ],
          }),
        }),
        FIXED_NOW,
      );

      expect(result).toEqual({
        valid: false,
        error: {
          code: 'INVALID_PAYLOAD',
          message: 'QR sync payload contains a malformed import entry.',
        },
      });
    });

    it('returns envelope error when message is not a QR sync message', () => {
      const result = parseQrSyncSyncReadyMessage({ foo: 'bar' }, FIXED_NOW);

      expect(result).toEqual({
        valid: false,
        error: {
          code: 'INVALID_PAYLOAD',
          message:
            'QR sync message does not match the expected envelope structure.',
        },
      });
    });
  });

  describe('validateQrSyncSecretImportsForOnboarding', () => {
    const pendingSecretImports = [
      {
        index: 0,
        value: 'word1 word2 word3',
        type: 'MNEMONIC' as const,
        isPrimary: true,
      },
    ];

    it('requires a primary mnemonic in pending secret imports', () => {
      expect(
        validateQrSyncSecretImportsForOnboarding(pendingSecretImports),
      ).toEqual({
        valid: true,
      });
      expect(
        validateQrSyncSecretImportsForOnboarding([
          { ...pendingSecretImports[0], isPrimary: false },
        ]),
      ).toEqual({
        valid: false,
        error: {
          code: 'INVALID_PAYLOAD',
          message:
            'QR sync payload must include a primary mnemonic when onboarding is not completed.',
        },
      });
    });

    it('returns invalid when pending secret imports are undefined', () => {
      expect(validateQrSyncSecretImportsForOnboarding(undefined)).toEqual({
        valid: false,
        error: {
          code: 'INVALID_PAYLOAD',
          message:
            'QR sync payload must include a primary mnemonic when onboarding is not completed.',
        },
      });
    });
  });
});
