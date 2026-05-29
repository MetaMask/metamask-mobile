import {
  ATTRIBUTION_DEFAULT_TTL_MS,
  type AttributionRecord,
} from '../../core/redux/slices/attribution';
import { getWalletSetupCompletedAttributionAnalyticsProps } from './walletSetupCompletedAttribution';

const baseRecord: AttributionRecord = {
  utm_source: 'email',
  utm_campaign: 'spring',
  attribution_id: 'aid-1',
  capturedAt: 10_000,
};

describe('getWalletSetupCompletedAttributionAnalyticsProps', () => {
  it('returns acquisition fields when marketing consent is true and record is within TTL', () => {
    const now = baseRecord.capturedAt + 1000;
    expect(
      getWalletSetupCompletedAttributionAnalyticsProps(baseRecord, true, now),
    ).toEqual({
      utm_source: 'email',
      utm_campaign: 'spring',
      attribution_id: 'aid-1',
    });
  });

  it('returns empty object when marketing consent is not true', () => {
    expect(
      getWalletSetupCompletedAttributionAnalyticsProps(
        baseRecord,
        false,
        99_000,
      ),
    ).toEqual({});
    expect(
      getWalletSetupCompletedAttributionAnalyticsProps(
        baseRecord,
        null,
        99_000,
      ),
    ).toEqual({});
  });

  it('returns empty object when attribution is null', () => {
    expect(
      getWalletSetupCompletedAttributionAnalyticsProps(null, true, 99_000),
    ).toEqual({});
  });

  it('returns empty object when record is older than TTL', () => {
    const now = baseRecord.capturedAt + ATTRIBUTION_DEFAULT_TTL_MS + 1;
    expect(
      getWalletSetupCompletedAttributionAnalyticsProps(baseRecord, true, now),
    ).toEqual({});
  });

  it('includes all utm_* fields when present', () => {
    const record: AttributionRecord = {
      ...baseRecord,
      utm_medium: 'cpc',
      utm_term: 'term',
      utm_content: 'content',
    };
    const props = getWalletSetupCompletedAttributionAnalyticsProps(
      record,
      true,
      record.capturedAt + 1,
    );
    expect(props).toEqual({
      utm_source: 'email',
      utm_medium: 'cpc',
      utm_campaign: 'spring',
      utm_term: 'term',
      utm_content: 'content',
      attribution_id: 'aid-1',
    });
  });

  it('skips blank string fields', () => {
    const record: AttributionRecord = {
      utm_source: '   ',
      utm_campaign: 'spring',
      capturedAt: 5,
    };
    const props = getWalletSetupCompletedAttributionAnalyticsProps(
      record,
      true,
      100,
    );
    expect(props).toEqual({
      utm_campaign: 'spring',
    });
  });
});
