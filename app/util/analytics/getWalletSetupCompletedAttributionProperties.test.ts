import initialRootState from '../test/initial-root-state';
import {
  ATTRIBUTION_DEFAULT_TTL_MS,
  type AttributionRecord,
} from '../../core/redux/slices/attribution';
import type { RootState } from '../../reducers';
import { getWalletSetupCompletedAttributionProperties } from './getWalletSetupCompletedAttributionProperties';

function stateWithAttribution(
  overrides: Partial<RootState> & {
    attributionRecord: AttributionRecord | null;
  },
): RootState {
  const { attributionRecord, ...rest } = overrides;
  return {
    ...initialRootState,
    ...rest,
    attribution: {
      ...initialRootState.attribution,
      attribution: attributionRecord,
    },
  } as RootState;
}

describe('getWalletSetupCompletedAttributionProperties', () => {
  const baseRecord: AttributionRecord = {
    utm_source: 'src',
    utm_medium: 'med',
    utm_campaign: 'camp',
    utm_term: 'term',
    utm_content: 'content',
    attribution_id: 'id-1',
    capturedAt: 1_700_000_000_000,
  };

  it('returns utm fields and attribution_id when consent is true and record is in TTL', () => {
    const now = baseRecord.capturedAt + 1000;
    const state = stateWithAttribution({
      security: {
        ...initialRootState.security,
        dataCollectionForMarketing: true,
      },
      attributionRecord: baseRecord,
    });

    expect(getWalletSetupCompletedAttributionProperties(state, now)).toEqual({
      utm_source: 'src',
      utm_medium: 'med',
      utm_campaign: 'camp',
      utm_term: 'term',
      utm_content: 'content',
      attribution_id: 'id-1',
    });
  });

  it('returns empty object when marketing consent is false', () => {
    const state = stateWithAttribution({
      security: {
        ...initialRootState.security,
        dataCollectionForMarketing: false,
      },
      attributionRecord: baseRecord,
    });

    expect(
      getWalletSetupCompletedAttributionProperties(
        state,
        baseRecord.capturedAt + 1000,
      ),
    ).toEqual({});
  });

  it('returns empty object when marketing consent is unset', () => {
    const state = stateWithAttribution({
      security: {
        ...initialRootState.security,
        dataCollectionForMarketing: null,
      },
      attributionRecord: baseRecord,
    });

    expect(
      getWalletSetupCompletedAttributionProperties(
        state,
        baseRecord.capturedAt + 1000,
      ),
    ).toEqual({});
  });

  it('returns empty object when there is no persisted attribution', () => {
    const state = stateWithAttribution({
      security: {
        ...initialRootState.security,
        dataCollectionForMarketing: true,
      },
      attributionRecord: null,
    });

    expect(
      getWalletSetupCompletedAttributionProperties(
        state,
        baseRecord.capturedAt + 1000,
      ),
    ).toEqual({});
  });

  it('returns empty object when attribution is past TTL', () => {
    const state = stateWithAttribution({
      security: {
        ...initialRootState.security,
        dataCollectionForMarketing: true,
      },
      attributionRecord: baseRecord,
    });

    const now = baseRecord.capturedAt + ATTRIBUTION_DEFAULT_TTL_MS + 1;
    expect(getWalletSetupCompletedAttributionProperties(state, now)).toEqual(
      {},
    );
  });

  it('omits empty or whitespace-only string fields', () => {
    const record: AttributionRecord = {
      utm_source: ' valid ',
      utm_medium: '',
      utm_campaign: '   ',
      attribution_id: 'x',
      capturedAt: 1_700_000_000_000,
    };
    const state = stateWithAttribution({
      security: {
        ...initialRootState.security,
        dataCollectionForMarketing: true,
      },
      attributionRecord: record,
    });

    expect(
      getWalletSetupCompletedAttributionProperties(
        state,
        record.capturedAt + 1,
      ),
    ).toEqual({
      utm_source: 'valid',
      attribution_id: 'x',
    });
  });
});
