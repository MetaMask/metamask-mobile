import {
  QrSyncPhases,
  QrSyncProvisioningStatuses,
} from '../../core/QrSync/constants';
import { defaultQrSyncControllerState } from '../../core/QrSync/QrSyncController';
import type { RootState } from '../../reducers';
import {
  selectQrSyncNeedsProvisioning,
  selectQrSyncPresentation,
  selectQrSyncShouldNavigateToImport,
} from './index';

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

const pendingPayload = {
  version: 1 as const,
  data: {
    wallets: [
      {
        id: 'wallet:test' as `wallet:${string}`,
        type: 'mnemonic' as const,
        value: 'word1 word2 word3',
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
  },
};

describe('qrSyncController selectors', () => {
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
