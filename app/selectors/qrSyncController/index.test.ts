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
  describe('selectQrSyncHasImportPlan', () => {
    it('returns true when import plan has entries', () => {
      const state = buildState({
        importPlan: [
          {
            index: 0,
            value: 'word1 word2 word3',
            type: 'MNEMONIC',
            accountName: null,
            hiddenIndexes: [],
            isPrimary: true,
          },
        ],
      });

      expect(selectQrSyncHasImportPlan(state)).toBe(true);
    });

    it('returns false when import plan is null or empty', () => {
      expect(selectQrSyncHasImportPlan(buildState({ importPlan: null }))).toBe(
        false,
      );
      expect(selectQrSyncHasImportPlan(buildState({ importPlan: [] }))).toBe(
        false,
      );
    });
  });

  describe('selectQrSyncShouldNavigateToImport', () => {
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

    it('returns true while reviewing import data', () => {
      expect(
        selectQrSyncShouldNavigateToImport(
          buildState({
            phase: QrSyncPhases.REVIEWING_IMPORT,
            importPlan,
          }),
        ),
      ).toBe(true);
    });

    it('returns false after sync completes', () => {
      expect(
        selectQrSyncShouldNavigateToImport(
          buildState({
            phase: QrSyncPhases.COMPLETED,
            importPlan,
          }),
        ),
      ).toBe(false);
    });
  });

  describe('selectQrSyncPresentation', () => {
    it('keeps device-linked presentation after sync completes with import data', () => {
      const state = buildState({
        phase: QrSyncPhases.COMPLETED,
        importPlan: [
          {
            index: 0,
            value: 'word1 word2 word3',
            type: 'MNEMONIC',
            accountName: null,
            hiddenIndexes: [],
            isPrimary: true,
          },
        ],
      });

      expect(selectQrSyncPresentation(state)).toBe('device-linked');
    });

    it('returns instructions when sync completes without import data', () => {
      const state = buildState({
        phase: QrSyncPhases.COMPLETED,
        importPlan: null,
      });

      expect(selectQrSyncPresentation(state)).toBe('instructions');
    });
  });
});
