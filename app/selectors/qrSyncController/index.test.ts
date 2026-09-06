import {
  QrSyncPhases,
  QrSyncProvisioningStatuses,
} from '../../core/QrSync/constants';
import { defaultQrSyncControllerState } from '../../core/QrSync/QrSyncController';
import type { RootState } from '../../reducers';
import {
  selectQrSyncNeedsProvisioning,
  selectQrSyncPresentation,
  selectQrSyncPrimaryMnemonic,
  selectQrSyncShouldNavigateToImport,
} from './index';

jest.mock('@metamask/keyring-sdk', () => ({
  encodeMnemonicWords: jest.fn(
    (bytes: Uint8Array) => `decoded:${bytes.join(',')}`,
  ),
}));

jest.mock('@metamask/account-tree-controller', () => ({
  ...jest.requireActual('@metamask/account-tree-controller'),
  decodeBytes: jest.fn((encoded: number[]) => new Uint8Array(encoded)),
}));

const buildState = (
  qrSyncState: Partial<typeof defaultQrSyncControllerState>,
): RootState =>
  ({
    engine: {
      backgroundState: {
        QrSyncController: {
          ...defaultQrSyncControllerState,
          ...qrSyncState,
        },
      },
    },
  }) as RootState;

// Minimal EncodedBytes value — actual word indices don't matter for selector tests.
const TEST_MNEMONIC_BYTES = [0, 1, 0, 2, 0, 3, 0, 4, 0, 5, 0, 6];

const pendingPayload = {
  version: 1 as const,
  wallets: [
    {
      id: 'wallet:test' as `wallet:${string}`,
      type: 'mnemonic' as const,
      value: TEST_MNEMONIC_BYTES,
      metadata: { name: 'Wallet 1' },
      groups: [
        {
          id: 'wallet:test/0' as `wallet:${string}/${string}`,
          groupIndex: 0,
          metadata: { name: 'Account 1', pinned: false, hidden: false },
        },
      ],
    },
  ],
};

describe('qrSyncController selectors', () => {
  describe('selectQrSyncPrimaryMnemonic', () => {
    it('decodes EncodedBytes value to a mnemonic phrase string', () => {
      const result = selectQrSyncPrimaryMnemonic(
        buildState({ pendingPayload }),
      );
      expect(result).toBe(`decoded:${TEST_MNEMONIC_BYTES.join(',')}`);
    });

    it('returns null when pendingPayload is null', () => {
      expect(
        selectQrSyncPrimaryMnemonic(buildState({ pendingPayload: null })),
      ).toBeNull();
    });

    it('returns null when value is absent', () => {
      const payloadWithoutValue = {
        ...pendingPayload,
        wallets: [{ ...pendingPayload.wallets[0], value: undefined }],
      };
      expect(
        selectQrSyncPrimaryMnemonic(
          buildState({ pendingPayload: payloadWithoutValue }),
        ),
      ).toBeNull();
    });
  });

  describe('selectQrSyncShouldNavigateToImport', () => {
    it('returns true when awaiting password with pending payload', () => {
      expect(
        selectQrSyncShouldNavigateToImport(
          buildState({
            provisioningStatus: QrSyncProvisioningStatuses.AWAITING_PASSWORD,
            pendingPayload,
          }),
        ),
      ).toBe(true);
    });

    it('returns true after sync completes while payload is still pending', () => {
      expect(
        selectQrSyncShouldNavigateToImport(
          buildState({
            phase: QrSyncPhases.COMPLETED,
            provisioningStatus: QrSyncProvisioningStatuses.AWAITING_PASSWORD,
            pendingPayload,
          }),
        ),
      ).toBe(true);
    });

    it('returns false when provisioning is not awaiting password', () => {
      expect(
        selectQrSyncShouldNavigateToImport(
          buildState({
            provisioningStatus: QrSyncProvisioningStatuses.SECRETS_IMPORTED,
            pendingPayload,
          }),
        ),
      ).toBe(false);
    });
  });

  describe('selectQrSyncNeedsProvisioning', () => {
    it('returns true when secrets are imported and payload is present', () => {
      expect(
        selectQrSyncNeedsProvisioning(
          buildState({
            provisioningStatus: QrSyncProvisioningStatuses.SECRETS_IMPORTED,
            pendingPayload,
          }),
        ),
      ).toBe(true);
    });

    it('returns false when provisioning status is not secrets_imported', () => {
      expect(
        selectQrSyncNeedsProvisioning(
          buildState({
            provisioningStatus: QrSyncProvisioningStatuses.AWAITING_PASSWORD,
            pendingPayload,
          }),
        ),
      ).toBe(false);
    });

    it('returns false when pending payload is null', () => {
      expect(
        selectQrSyncNeedsProvisioning(
          buildState({
            provisioningStatus: QrSyncProvisioningStatuses.SECRETS_IMPORTED,
            pendingPayload: null,
          }),
        ),
      ).toBe(false);
    });

    it('returns false when provisioning is already completed', () => {
      expect(
        selectQrSyncNeedsProvisioning(
          buildState({
            provisioningStatus: QrSyncProvisioningStatuses.COMPLETED,
            pendingPayload: null,
          }),
        ),
      ).toBe(false);
    });
  });

  describe('selectQrSyncPresentation', () => {
    it('keeps device-linked presentation after sync completes with pending payload', () => {
      const state = buildState({
        phase: QrSyncPhases.COMPLETED,
        pendingPayload,
      });

      expect(selectQrSyncPresentation(state)).toBe('device-linked');
    });

    it('returns instructions when sync completes without pending payload', () => {
      const state = buildState({
        phase: QrSyncPhases.COMPLETED,
        pendingPayload: null,
      });

      expect(selectQrSyncPresentation(state)).toBe('instructions');
    });
  });
});
