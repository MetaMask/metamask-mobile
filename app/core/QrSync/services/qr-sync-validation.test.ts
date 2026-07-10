import type { SessionRequest } from '@metamask/mobile-wallet-protocol-core';
import { deflate } from 'pako';

import { QrSyncActionTypes, QrSyncMessageVersion } from '../constants';
import type { QrSyncData, QrSyncDataEntry, QrSyncMessage } from '../types';
import {
  isQrSyncConnectionRequest,
  isQrSyncData,
  isQrSyncDataEntry,
  isQrSyncMessage,
  isQrSyncSecretMetadata,
  isQrSyncSessionRequest,
  isQrSyncSyncReadyMessage,
  normalizeQrSyncData,
  normalizeQrSyncDataEntry,
  parseQrSyncConnectionRequest,
  QR_SYNC_MWP_DEEPLINK_PREFIX,
  validateAndNormalizeQrSyncData,
  validateAndNormalizeQrSyncReadyMessage,
  validateQrSyncData,
  validateQrSyncDataSemantics,
  validateQrSyncImportPlanForOnboarding,
  validateQrSyncReadyMessage,
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

const createMwpDeeplink = (payload: string): string =>
  `${QR_SYNC_MWP_DEEPLINK_PREFIX}?p=${encodeURIComponent(payload)}`;

const createSessionRequest = (
  overrides: Partial<SessionRequest> = {},
): SessionRequest => ({
  id: VALID_SESSION_ID,
  publicKeyB64: VALID_PUBLIC_KEY_B64,
  channel: VALID_CHANNEL,
  mode: 'untrusted',
  expiresAt: Date.now() + 600_000,
  ...overrides,
});

const createDataEntry = (
  overrides: Partial<QrSyncDataEntry> = {},
): QrSyncDataEntry => ({
  value: encodeSecret('test secret value'),
  type: 'MNEMONIC',
  ...overrides,
});

const createSyncData = (overrides: Partial<QrSyncData> = {}): QrSyncData => ({
  deadline: FUTURE_DEADLINE,
  data: [createDataEntry()],
  ...overrides,
});

const createSyncReadyMessage = (
  overrides: Partial<QrSyncMessage<QrSyncData>> = {},
): QrSyncMessage<QrSyncData> => ({
  type: QrSyncActionTypes.SYNC_READY,
  version: QrSyncMessageVersion.V1,
  data: createSyncData(),
  ...overrides,
});

describe('qr-sync-validation', () => {
  describe('parseQrSyncConnectionRequest', () => {
    it('parses metamask://connect/mwp deeplinks with base64 p parameter', () => {
      const connectionRequest = { sessionRequest: createSessionRequest() };
      const deeplink = createMwpDeeplink(encodeBase64Json(connectionRequest));

      const result = parseQrSyncConnectionRequest(deeplink);

      expect(result).toEqual(connectionRequest);
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

    it('throws when raw QR data is not a valid MWP deeplink', () => {
      expect(() => parseQrSyncConnectionRequest('not-a-deeplink')).toThrow(
        'QR sync scan payload is not a valid MWP deeplink.',
      );
    });

    it('throws when raw QR data is not JSON', () => {
      const notJsonDeeplink = createMwpDeeplink('not-json');
      expect(() => parseQrSyncConnectionRequest(notJsonDeeplink)).toThrow(
        'Invalid session request payload.',
      );
    });

    it('throws when JSON does not contain a session request', () => {
      const rawQrData = JSON.stringify({ foo: 'bar' });
      const invalidJsonDeeplink = createMwpDeeplink(rawQrData);

      expect(() => parseQrSyncConnectionRequest(invalidJsonDeeplink)).toThrow(
        'Invalid session request payload.',
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

  describe('isQrSyncConnectionRequest', () => {
    it('returns true for a direct session request object', () => {
      const sessionRequest = createSessionRequest();

      const result = isQrSyncConnectionRequest(sessionRequest);

      expect(result).toBe(true);
    });

    it('returns true for a wrapped { sessionRequest } object', () => {
      const connectionRequest = {
        sessionRequest: createSessionRequest(),
      };

      const result = isQrSyncConnectionRequest(connectionRequest);

      expect(result).toBe(true);
    });

    it('returns false when sessionRequest field is missing', () => {
      const result = isQrSyncConnectionRequest({ other: 'field' });

      expect(result).toBe(false);
    });
  });

  describe('isQrSyncSecretMetadata', () => {
    it('returns true for optional string, integer array, and boolean fields', () => {
      const metadata = {
        accountName: 'Account 1',
        hiddenIndexes: [0, 2],
        isPrimary: true,
      };

      const result = isQrSyncSecretMetadata(metadata);

      expect(result).toBe(true);
    });

    it('returns true for an empty metadata object', () => {
      const result = isQrSyncSecretMetadata({});

      expect(result).toBe(true);
    });

    it('returns false when hiddenIndexes contains non-integers', () => {
      const metadata = { hiddenIndexes: [0, 1.5] };

      const result = isQrSyncSecretMetadata(metadata);

      expect(result).toBe(false);
    });
  });

  describe('isQrSyncDataEntry', () => {
    it('returns true for mnemonic and private key entries with non-empty values', () => {
      expect(isQrSyncDataEntry(createDataEntry({ type: 'MNEMONIC' }))).toBe(
        true,
      );
      expect(
        isQrSyncDataEntry(
          createDataEntry({
            type: 'PRIVATE_KEY',
            value: encodeSecret('0xabc'),
          }),
        ),
      ).toBe(true);
    });

    it('returns false for empty secret values', () => {
      const result = isQrSyncDataEntry(createDataEntry({ value: '' }));

      expect(result).toBe(false);
    });

    it('returns false for unsupported secret types', () => {
      const result = isQrSyncDataEntry(
        createDataEntry({ type: 'SEED_PHRASE' as QrSyncDataEntry['type'] }),
      );

      expect(result).toBe(false);
    });
  });

  describe('isQrSyncData', () => {
    it('returns true when deadline is finite and entries are valid', () => {
      const result = isQrSyncData(createSyncData());

      expect(result).toBe(true);
    });

    it('returns false when data entries array is missing', () => {
      const result = isQrSyncData({ deadline: FUTURE_DEADLINE });

      expect(result).toBe(false);
    });
  });

  describe('isQrSyncMessage', () => {
    it('returns true for known action types with version 1.0.0', () => {
      const message = {
        type: QrSyncActionTypes.SYNC_OFFER,
        version: QrSyncMessageVersion.V1,
      };

      const result = isQrSyncMessage(message);

      expect(result).toBe(true);
    });

    it('returns false for unknown action types', () => {
      const message = {
        type: 'unknown-action',
        version: QrSyncMessageVersion.V1,
      };

      const result = isQrSyncMessage(message);

      expect(result).toBe(false);
    });

    it('returns false for unsupported message versions', () => {
      const message = {
        type: QrSyncActionTypes.SYNC_READY,
        version: '2.0.0',
      };

      const result = isQrSyncMessage(message);

      expect(result).toBe(false);
    });
  });

  describe('isQrSyncSyncReadyMessage', () => {
    it('returns true for sync-ready messages with valid import data', () => {
      const result = isQrSyncSyncReadyMessage(createSyncReadyMessage());

      expect(result).toBe(true);
    });

    it('returns false when message type is not sync-ready', () => {
      const message = {
        type: QrSyncActionTypes.SYNC_OFFER,
        version: QrSyncMessageVersion.V1,
        data: createSyncData(),
      };

      const result = isQrSyncSyncReadyMessage(message);

      expect(result).toBe(false);
    });
  });

  describe('validateQrSyncData', () => {
    it('returns valid for payloads with entries and a future deadline', () => {
      const result = validateQrSyncData(createSyncData(), FIXED_NOW);

      expect(result).toEqual({ valid: true });
    });

    it('returns INVALID_PAYLOAD when import entries array is empty', () => {
      const result = validateQrSyncData(
        createSyncData({ data: [] }),
        FIXED_NOW,
      );

      expect(result).toEqual({
        valid: false,
        error: {
          code: 'INVALID_PAYLOAD',
          message: 'QR sync payload must include at least one import entry.',
        },
      });
    });

    it('returns SESSION_EXPIRED when deadline is not after current time', () => {
      const result = validateQrSyncData(
        createSyncData({ deadline: FIXED_NOW }),
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
  });

  describe('validateQrSyncImportPlanForOnboarding', () => {
    const importPlan = [
      {
        index: 0,
        value: 'word1 word2 word3',
        type: 'MNEMONIC' as const,
        accountName: null,
        hiddenIndexes: [],
        isPrimary: true,
      },
    ];

    it('requires a primary mnemonic when onboarding is not completed', () => {
      expect(validateQrSyncImportPlanForOnboarding(importPlan, false)).toEqual({
        valid: true,
      });
      expect(
        validateQrSyncImportPlanForOnboarding(
          [{ ...importPlan[0], isPrimary: false }],
          false,
        ),
      ).toEqual({
        valid: false,
        error: {
          code: 'INVALID_PAYLOAD',
          message:
            'QR sync payload must include a primary mnemonic when onboarding is not completed.',
        },
      });
    });

    it('does not require a primary mnemonic when onboarding is completed', () => {
      expect(
        validateQrSyncImportPlanForOnboarding(
          [{ ...importPlan[0], isPrimary: false }],
          true,
        ),
      ).toEqual({
        valid: true,
      });
    });
  });

  describe('validateQrSyncDataSemantics', () => {
    it('returns valid when at most one mnemonic is marked primary', () => {
      const result = validateQrSyncDataSemantics(
        createSyncData({
          data: [
            createDataEntry({
              metadata: { isPrimary: true },
            }),
          ],
        }),
      );

      expect(result).toEqual({ valid: true });
    });

    it('returns INVALID_PAYLOAD when a private key entry is marked primary', () => {
      const result = validateQrSyncDataSemantics(
        createSyncData({
          data: [
            createDataEntry({
              type: 'PRIVATE_KEY',
              metadata: { isPrimary: true },
            }),
          ],
        }),
      );

      expect(result).toEqual({
        valid: false,
        error: {
          code: 'INVALID_PAYLOAD',
          message: 'Only mnemonic entries may be marked as primary.',
        },
      });
    });

    it('returns INVALID_PAYLOAD when hiddenIndexes is set on a private key entry', () => {
      const result = validateQrSyncDataSemantics(
        createSyncData({
          data: [
            createDataEntry({
              type: 'PRIVATE_KEY',
              metadata: { hiddenIndexes: [1] },
            }),
          ],
        }),
      );

      expect(result).toEqual({
        valid: false,
        error: {
          code: 'INVALID_PAYLOAD',
          message: 'hiddenIndexes is only supported for mnemonic entries.',
        },
      });
    });

    it('returns INVALID_PAYLOAD when more than one mnemonic is marked primary', () => {
      const result = validateQrSyncDataSemantics(
        createSyncData({
          data: [
            createDataEntry({ metadata: { isPrimary: true } }),
            createDataEntry({ metadata: { isPrimary: true } }),
          ],
        }),
      );

      expect(result).toEqual({
        valid: false,
        error: {
          code: 'INVALID_PAYLOAD',
          message: 'QR sync payload may include at most one primary mnemonic.',
        },
      });
    });
  });

  describe('normalizeQrSyncDataEntry', () => {
    it('maps metadata fields to import plan defaults', () => {
      const entry = createDataEntry({
        value: 'decoded-secret',
        metadata: {
          accountName: 'Imported Account',
          hiddenIndexes: [0, 3],
          isPrimary: true,
        },
      });

      const result = normalizeQrSyncDataEntry(entry, 2);

      expect(result).toEqual({
        index: 2,
        value: 'decoded-secret',
        type: 'MNEMONIC',
        accountName: 'Imported Account',
        hiddenIndexes: [0, 3],
        isPrimary: true,
      });
    });

    it('uses null account name, empty hiddenIndexes, and isPrimary false when metadata is absent', () => {
      const entry = createDataEntry({
        value: 'decoded-secret',
        metadata: undefined,
      });

      const result = normalizeQrSyncDataEntry(entry, 0);

      expect(result).toEqual({
        index: 0,
        value: 'decoded-secret',
        type: 'MNEMONIC',
        accountName: null,
        hiddenIndexes: [],
        isPrimary: false,
      });
    });
  });

  describe('normalizeQrSyncData', () => {
    it('base64-decodes each entry value into the import plan', () => {
      const plaintext = 'word1 word2 word3';
      const syncData = createSyncData({
        data: [createDataEntry({ value: encodeSecret(plaintext) })],
      });

      const result = normalizeQrSyncData(syncData);

      expect(result).toEqual([
        {
          index: 0,
          value: plaintext,
          type: 'MNEMONIC',
          accountName: null,
          hiddenIndexes: [],
          isPrimary: false,
        },
      ]);
    });
  });

  describe('validateAndNormalizeQrSyncData', () => {
    it('returns decoded import plan when validation passes', () => {
      const plaintext = 'import me';
      const syncData = createSyncData({
        data: [createDataEntry({ value: encodeSecret(plaintext) })],
      });

      const result = validateAndNormalizeQrSyncData(syncData, FIXED_NOW);

      expect(result).toEqual({
        valid: true,
        plan: [
          {
            index: 0,
            value: plaintext,
            type: 'MNEMONIC',
            accountName: null,
            hiddenIndexes: [],
            isPrimary: false,
          },
        ],
      });
    });

    it('returns validation error without a plan when validation fails', () => {
      const result = validateAndNormalizeQrSyncData(
        createSyncData({ data: [] }),
        FIXED_NOW,
      );

      expect(result).toEqual({
        valid: false,
        error: {
          code: 'INVALID_PAYLOAD',
          message: 'QR sync payload must include at least one import entry.',
        },
      });
    });
  });

  describe('validateQrSyncReadyMessage', () => {
    it('returns valid for a well-formed sync-ready wire message', () => {
      const result = validateQrSyncReadyMessage(
        createSyncReadyMessage(),
        FIXED_NOW,
      );

      expect(result).toEqual({ valid: true });
    });

    it('returns INVALID_PAYLOAD when envelope type is not sync-ready', () => {
      const result = validateQrSyncReadyMessage(
        {
          type: QrSyncActionTypes.SYNC_OFFER,
          version: QrSyncMessageVersion.V1,
          data: createSyncData(),
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

    it('returns INVALID_PAYLOAD when envelope version is not 1.0.0', () => {
      const result = validateQrSyncReadyMessage(
        {
          type: QrSyncActionTypes.SYNC_READY,
          version: '9.9.9',
          data: createSyncData(),
        },
        FIXED_NOW,
      );

      expect(result).toEqual({
        valid: false,
        error: {
          code: 'INVALID_PAYLOAD',
          message:
            'QR sync message does not match the expected envelope structure.',
        },
      });
    });

    it('returns INVALID_PAYLOAD when sync-ready data payload is malformed', () => {
      const result = validateQrSyncReadyMessage(
        {
          type: QrSyncActionTypes.SYNC_READY,
          version: QrSyncMessageVersion.V1,
          data: { deadline: FUTURE_DEADLINE },
        },
        FIXED_NOW,
      );

      expect(result).toEqual({
        valid: false,
        error: {
          code: 'INVALID_PAYLOAD',
          message: 'QR sync message payload is malformed.',
        },
      });
    });
  });

  describe('validateAndNormalizeQrSyncReadyMessage', () => {
    it('returns decoded import plan for a valid sync-ready wire message', () => {
      const plaintext = 'mnemonic phrase';
      const message = createSyncReadyMessage({
        data: createSyncData({
          data: [createDataEntry({ value: encodeSecret(plaintext) })],
        }),
      });

      const result = validateAndNormalizeQrSyncReadyMessage(message, FIXED_NOW);

      expect(result).toEqual({
        valid: true,
        plan: [
          {
            index: 0,
            value: plaintext,
            type: 'MNEMONIC',
            accountName: null,
            hiddenIndexes: [],
            isPrimary: false,
          },
        ],
      });
    });

    it('returns envelope error when message is not a QR sync message', () => {
      const result = validateAndNormalizeQrSyncReadyMessage(
        { foo: 'bar' },
        FIXED_NOW,
      );

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
});
