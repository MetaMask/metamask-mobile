import { QrSyncPhases } from '../../core/QrSync/constants';
import { defaultQrSyncControllerState } from '../../core/QrSync/QrSyncController';
import type { RootState } from '../../reducers';
import {
  selectQrSyncHasImportPlan,
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
      type: 'MNEMONIC' as const,
      isPrimary: true,
    },
  ];

  describe('selectQrSyncHasImportPlan', () => {
    it('returns true when pending secrets exist', () => {
      const state = buildState({
        pendingSecretImports,
      });

      expect(selectQrSyncHasImportPlan(state)).toBe(true);
    });

    it('returns false when pending secrets are null or empty', () => {
      expect(
        selectQrSyncHasImportPlan(buildState({ pendingSecretImports: null })),
      ).toBe(false);
      expect(
        selectQrSyncHasImportPlan(buildState({ pendingSecretImports: [] })),
      ).toBe(false);
    });
  });

  describe('selectQrSyncShouldNavigateToImport', () => {
    it('returns true when awaiting password with pending secrets', () => {
      expect(
        selectQrSyncShouldNavigateToImport(
          buildState({
            provisioningStatus: 'awaiting_password',
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
            provisioningStatus: 'awaiting_password',
            pendingSecretImports,
          }),
        ),
      ).toBe(true);
    });

    it('returns false when provisioning is not awaiting password', () => {
      expect(
        selectQrSyncShouldNavigateToImport(
          buildState({
            provisioningStatus: 'secrets_imported',
            pendingSecretImports,
          }),
        ),
      ).toBe(false);
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
