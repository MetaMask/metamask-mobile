import type { RootState } from '../../reducers';
import {
  selectAttributionRecord,
  selectWalletSetupCompletedAttributionAnalyticsProps,
} from './index';

describe('attribution selectors', () => {
  it('returns nested attribution record from root state', () => {
    const state = {
      attribution: {
        attribution: {
          utm_source: 'email',
          capturedAt: 42,
        },
        _persist: { version: 0, rehydrated: true },
      },
    } as unknown as RootState;

    expect(selectAttributionRecord(state)).toEqual({
      utm_source: 'email',
      capturedAt: 42,
    });
  });

  it('returns null when slice has no attribution record', () => {
    const state = {
      attribution: {
        attribution: null,
        _persist: { version: 0, rehydrated: true },
      },
    } as unknown as RootState;

    expect(selectAttributionRecord(state)).toBeNull();
  });

  describe('selectWalletSetupCompletedAttributionAnalyticsProps', () => {
    it('merges marketing consent and persisted attribution', () => {
      const now = Date.now();
      const state = {
        security: { dataCollectionForMarketing: true },
        attribution: {
          attribution: {
            utm_source: 'x',
            capturedAt: now - 1000,
            attribution_id: 'id-1',
          },
          _persist: { version: 0, rehydrated: true },
        },
      } as unknown as RootState;

      expect(
        selectWalletSetupCompletedAttributionAnalyticsProps(state),
      ).toEqual({
        utm_source: 'x',
        attribution_id: 'id-1',
      });
    });

    it('returns empty object when marketing consent is false', () => {
      const state = {
        security: { dataCollectionForMarketing: false },
        attribution: {
          attribution: {
            utm_source: 'x',
            capturedAt: Date.now() - 1000,
          },
          _persist: { version: 0, rehydrated: true },
        },
      } as unknown as RootState;

      expect(
        selectWalletSetupCompletedAttributionAnalyticsProps(state),
      ).toEqual({});
    });
  });
});
