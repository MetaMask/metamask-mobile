import type {
  AccountGroupPayloadId,
  AccountTreePayload,
  AccountWalletPayloadId,
  VersionedState,
} from '@metamask/account-tree-controller';
import type { SessionRequest } from '@metamask/mobile-wallet-protocol-core';

import { QrSyncActionTypes, QrSyncMessageVersion } from '../constants';
import type { QrSyncSyncReadyMessage } from '../types';
import {
  isQrSyncConnectionRequest,
  isQrSyncSessionRequest,
  parseQrSyncConnectionRequest,
  parseQrSyncSyncReadyMessage,
  QR_SYNC_MWP_DEEPLINK_PREFIX,
  validateQrSyncPayloadForOnboarding,
} from './qr-sync-validation';

const VALID_SESSION_ID = '11111111-2222-3333-4444-555555555555';
const VALID_CHANNEL = 'handshake:aabbccdd-1122-3344-5566-778899aabbcc';
/** Base64-encoded 33-byte compressed public key. */
const VALID_PUBLIC_KEY_B64 = 'AoBDLWxRbJNe8yUv5bmmoVnNo8DCilzbFz/nWD+RKC2V';
const FIXED_NOW = 1_700_000_000_000;
const FUTURE_DEADLINE = FIXED_NOW + 60_000;

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

const defaultSyncReadyPayload = (): VersionedState<AccountTreePayload> => ({
  version: 1,
  data: {
    wallets: [
      {
        id: 'wallet:test-primary' as AccountWalletPayloadId,
        type: 'mnemonic',
        value: 'word1 word2 word3',
        metadata: { name: 'Wallet 1' },
        groups: [
          {
            id: 'wallet:test-primary/0' as AccountGroupPayloadId,
            groupIndex: 0,
            metadata: { name: 'Account 1', pinned: false, hidden: false },
          },
        ],
      },
    ],
  },
});

const createSyncReadyMessage = (
  overrides: Partial<QrSyncSyncReadyMessage> = {},
): QrSyncSyncReadyMessage => ({
  type: QrSyncActionTypes.SYNC_READY,
  version: QrSyncMessageVersion.V1,
  deadline: FUTURE_DEADLINE,
  data: defaultSyncReadyPayload(),
  ...overrides,
});

describe('qr-sync-validation', () => {
  describe('parseQrSyncConnectionRequest', () => {
    it('parses metamask://connect/mwp deeplinks with base64 p parameter', () => {
      const sessionRequest = createSessionRequest();
      const deeplink = createMwpDeeplink(encodeBase64Json(sessionRequest));

      const result = parseQrSyncConnectionRequest(deeplink);

      expect(result).toEqual({ sessionRequest });
    });

    it('parses wrapped { sessionRequest } MWP connection payloads', () => {
      const sessionRequest = createSessionRequest();
      const deeplink = createMwpDeeplink(encodeBase64Json({ sessionRequest }));

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
      const invalidJsonDeeplink = createMwpDeeplink(
        encodeBase64Json({ foo: 'bar' }),
      );

      expect(() => parseQrSyncConnectionRequest(invalidJsonDeeplink)).toThrow(
        'QR sync scan payload does not contain a valid session request.',
      );
    });
  });

  describe('isQrSyncConnectionRequest', () => {
    it('returns true for a bare session request', () => {
      expect(isQrSyncConnectionRequest(createSessionRequest())).toBe(true);
    });

    it('returns true for a wrapped session request', () => {
      const sessionRequest = createSessionRequest();

      expect(isQrSyncConnectionRequest({ sessionRequest })).toBe(true);
    });

    it('returns false when sessionRequest is missing or invalid', () => {
      expect(isQrSyncConnectionRequest(null)).toBe(false);
      expect(isQrSyncConnectionRequest({ foo: 'bar' })).toBe(false);
      expect(
        isQrSyncConnectionRequest({
          sessionRequest: { ...createSessionRequest(), id: 'not-a-uuid' },
        }),
      ).toBe(false);
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
    it('returns the VersionedState payload from a valid sync-ready message', () => {
      const payload = defaultSyncReadyPayload();
      const message = createSyncReadyMessage({ data: payload });

      const result = parseQrSyncSyncReadyMessage(message, FIXED_NOW);

      expect(result).toEqual({
        valid: true,
        pendingPayload: payload,
      });
    });

    it('passes through a multi-wallet versioned payload intact', () => {
      const payload: VersionedState<AccountTreePayload> = {
        version: 1,
        data: {
          wallets: [
            {
              id: 'wallet:test-primary' as AccountWalletPayloadId,
              type: 'mnemonic',
              value: 'word1 word2 word3',
              metadata: { name: 'Wallet 1' },
              groups: [
                {
                  id: 'wallet:test-primary/0' as AccountGroupPayloadId,
                  groupIndex: 0,
                  metadata: { name: 'Account 1', pinned: false, hidden: false },
                },
              ],
            },
            {
              id: 'wallet:test-pk' as AccountWalletPayloadId,
              type: 'private-key',
              metadata: { name: 'Imported Accounts' },
              groups: [
                {
                  id: 'wallet:test-pk/0xabc' as AccountGroupPayloadId,
                  value: {
                    privateKey: '0xabc',
                    encoding: 'hexadecimal' as const,
                  },
                  metadata: {
                    name: 'Imported Account 1',
                    pinned: false,
                    hidden: false,
                  },
                },
              ],
            },
          ],
        },
      };

      const result = parseQrSyncSyncReadyMessage(
        createSyncReadyMessage({ data: payload }),
        FIXED_NOW,
      );

      expect(result).toEqual({ valid: true, pendingPayload: payload });
    });

    it('returns SESSION_EXPIRED when deadline is not after current time', () => {
      const result = parseQrSyncSyncReadyMessage(
        createSyncReadyMessage({ deadline: FIXED_NOW }),
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

    it('returns INVALID_PAYLOAD when envelope type is not sync-ready', () => {
      const result = parseQrSyncSyncReadyMessage(
        {
          type: QrSyncActionTypes.SYNC_OFFER,
          version: QrSyncMessageVersion.V1,
          deadline: FUTURE_DEADLINE,
          data: defaultSyncReadyPayload(),
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

    it('returns INVALID_PAYLOAD when data is not a VersionedState payload', () => {
      const result = parseQrSyncSyncReadyMessage(
        {
          type: QrSyncActionTypes.SYNC_READY,
          version: QrSyncMessageVersion.V1,
          deadline: FUTURE_DEADLINE,
          data: [] as unknown as VersionedState<AccountTreePayload>,
        },
        FIXED_NOW,
      );

      expect(result).toEqual({
        valid: false,
        error: {
          code: 'INVALID_PAYLOAD',
          message:
            'QR sync message payload is malformed or uses an unsupported version.',
        },
      });
    });

    it('returns INVALID_PAYLOAD when wallets array is empty', () => {
      const result = parseQrSyncSyncReadyMessage(
        createSyncReadyMessage({
          data: { version: 1, data: { wallets: [] } },
        }),
        FIXED_NOW,
      );

      expect(result).toEqual({
        valid: false,
        error: {
          code: 'INVALID_PAYLOAD',
          message: 'QR sync payload must include at least one wallet.',
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

  describe('validateQrSyncPayloadForOnboarding', () => {
    it('returns valid when payload has a mnemonic wallet with a value', () => {
      const payload: VersionedState<AccountTreePayload> = {
        version: 1,
        data: {
          wallets: [
            {
              id: 'wallet:test' as AccountWalletPayloadId,
              type: 'mnemonic',
              value: 'word1 word2 word3',
              metadata: { name: 'Wallet 1' },
              groups: [
                {
                  id: 'wallet:test/0' as AccountGroupPayloadId,
                  groupIndex: 0,
                  metadata: { name: 'Account 1', pinned: false, hidden: false },
                },
              ],
            },
          ],
        },
      };

      expect(validateQrSyncPayloadForOnboarding(payload)).toEqual({
        valid: true,
      });
    });

    it('returns invalid when no mnemonic wallet is present', () => {
      const payload: VersionedState<AccountTreePayload> = {
        version: 1,
        data: {
          wallets: [
            {
              id: 'wallet:test-pk' as AccountWalletPayloadId,
              type: 'private-key',
              metadata: { name: 'Imported Wallet' },
              groups: [],
            },
          ],
        },
      };

      expect(validateQrSyncPayloadForOnboarding(payload)).toEqual({
        valid: false,
        error: {
          code: 'INVALID_PAYLOAD',
          message:
            'QR sync payload must include a primary mnemonic for new-user onboarding.',
        },
      });
    });

    it('returns invalid when mnemonic wallet has no value', () => {
      const payload: VersionedState<AccountTreePayload> = {
        version: 1,
        data: {
          wallets: [
            {
              id: 'wallet:test' as AccountWalletPayloadId,
              type: 'mnemonic',
              // value intentionally omitted (metadata-only export)
              metadata: { name: 'Wallet 1' },
              groups: [
                {
                  id: 'wallet:test/0' as AccountGroupPayloadId,
                  groupIndex: 0,
                  metadata: { name: 'Account 1', pinned: false, hidden: false },
                },
              ],
            },
          ],
        },
      };

      expect(validateQrSyncPayloadForOnboarding(payload)).toEqual({
        valid: false,
        error: {
          code: 'INVALID_PAYLOAD',
          message:
            'QR sync payload must include a primary mnemonic for new-user onboarding.',
        },
      });
    });

    it('returns invalid when payload is undefined', () => {
      expect(validateQrSyncPayloadForOnboarding(undefined)).toEqual({
        valid: false,
        error: {
          code: 'INVALID_PAYLOAD',
          message:
            'QR sync payload must include a primary mnemonic for new-user onboarding.',
        },
      });
    });
  });
});
