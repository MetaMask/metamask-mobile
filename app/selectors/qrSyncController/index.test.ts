import {
  QrSyncMessageVersion,
  QrSyncPhases,
  QrSyncProvisioningStatuses,
  QrSyncSecretTypes,
} from '../../core/QrSync/constants';
import { defaultQrSyncControllerState } from '../../core/QrSync/QrSyncController';
import type { RootState } from '../../reducers';
import {
  selectQrSyncExistingUserImportMnemonic,
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

describe('qrSyncController selectors', () => {
  const pendingSecretImports = [
    {
      index: 0,
      value: 'word1 word2 word3',
      type: QrSyncSecretTypes.MNEMONIC,
      isPrimary: true,
    },
  ];

  describe('selectQrSyncShouldNavigateToImport', () => {
    it('returns true when awaiting password with pending secrets', () => {
      expect(
        selectQrSyncShouldNavigateToImport(
          buildState({
            provisioningStatus: QrSyncProvisioningStatuses.AWAITING_PASSWORD,
            pendingSecretImports,
          }),
        ),
      ).toBe(true);
    });

    it('returns true after sync completes while secrets are still pending', () => {
      expect(
        selectQrSyncShouldNavigateToImport(
          buildState({
            phase: QrSyncPhases.COMPLETED,
            provisioningStatus: QrSyncProvisioningStatuses.AWAITING_PASSWORD,
            pendingSecretImports,
          }),
        ),
      ).toBe(true);
    });

    it('returns false when provisioning is not awaiting password', () => {
      expect(
        selectQrSyncShouldNavigateToImport(
          buildState({
            provisioningStatus: QrSyncProvisioningStatuses.SECRETS_IMPORTED,
            pendingSecretImports,
          }),
        ),
      ).toBe(false);
    });
  });

  const provisioningMetadata = {
    version: QrSyncMessageVersion.V1,
    entries: [
      {
        index: 0,
        type: QrSyncSecretTypes.MNEMONIC,
        isPrimary: true,
        entropySource: 'entropy-1',
      },
    ],
  };

  describe('selectQrSyncNeedsProvisioning', () => {
    it('returns true when secrets are imported and metadata is present', () => {
      expect(
        selectQrSyncNeedsProvisioning(
          buildState({
            provisioningStatus: QrSyncProvisioningStatuses.SECRETS_IMPORTED,
            provisioningMetadata,
          }),
        ),
      ).toBe(true);
    });

    it('returns true when provisioning status is not secrets_imported', () => {
      expect(
        selectQrSyncNeedsProvisioning(
          buildState({
            provisioningStatus: QrSyncProvisioningStatuses.AWAITING_PASSWORD,
            provisioningMetadata,
          }),
        ),
      ).toBe(false);
    });

    it('returns false when provisioning metadata is null', () => {
      expect(
        selectQrSyncNeedsProvisioning(
          buildState({
            provisioningStatus: QrSyncProvisioningStatuses.SECRETS_IMPORTED,
            provisioningMetadata: null,
          }),
        ),
      ).toBe(false);
    });

    it('returns false when provisioning is already completed with import data still pending', () => {
      expect(
        selectQrSyncNeedsProvisioning(
          buildState({
            provisioningStatus: QrSyncProvisioningStatuses.COMPLETED,
            provisioningMetadata: null,
          }),
        ),
      ).toBe(false);
    });
  });

  describe('selectQrSyncExistingUserImportMnemonic', () => {
    it('returns the primary mnemonic when flagged', () => {
      const state = buildState({
        pendingSecretImports: [
          {
            index: 0,
            value: 'primary mnemonic',
            type: QrSyncSecretTypes.MNEMONIC,
            isPrimary: true,
          },
          {
            index: 1,
            value: 'secondary mnemonic',
            type: QrSyncSecretTypes.MNEMONIC,
            isPrimary: false,
          },
        ],
      });

      expect(selectQrSyncExistingUserImportMnemonic(state)).toBe(
        'primary mnemonic',
      );
    });

    it('falls back to the first mnemonic when isPrimary is absent', () => {
      const state = buildState({
        pendingSecretImports: [
          {
            index: 0,
            value: 'extension mnemonic',
            type: QrSyncSecretTypes.MNEMONIC,
            isPrimary: false,
          },
        ],
      });

      expect(selectQrSyncExistingUserImportMnemonic(state)).toBe(
        'extension mnemonic',
      );
    });
  });

  describe('selectQrSyncPresentation', () => {
    it('keeps device-linked presentation after sync completes with pending secrets', () => {
      const state = buildState({
        phase: QrSyncPhases.COMPLETED,
        pendingSecretImports,
      });

      expect(selectQrSyncPresentation(state)).toBe('device-linked');
    });

    it('returns instructions when sync completes without pending secrets', () => {
      const state = buildState({
        phase: QrSyncPhases.COMPLETED,
        pendingSecretImports: null,
      });

      expect(selectQrSyncPresentation(state)).toBe('instructions');
    });
  });
});
