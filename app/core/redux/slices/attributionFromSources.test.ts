import {
  attributionPayloadFromDeeplink,
  attributionPayloadFromProcessAttribution,
} from './attributionFromSources';

describe('attributionFromSources', () => {
  describe('attributionPayloadFromDeeplink', () => {
    it('returns null when the URL carries no attributable query params', () => {
      expect(attributionPayloadFromDeeplink('metamask://connect')).toBeNull();
    });

    it('maps camelCase attributionId from the deeplink', () => {
      expect(
        attributionPayloadFromDeeplink(
          'metamask://connect?attributionId=id-camel&utm_source=x',
        ),
      ).toEqual({
        attribution_id: 'id-camel',
        utm_source: 'x',
      });
    });

    it('falls back to snake_case attribution_id when camelCase absent', () => {
      expect(
        attributionPayloadFromDeeplink(
          'metamask://connect?attribution_id=id-snake&utm_medium=email',
        ),
      ).toEqual({
        attribution_id: 'id-snake',
        utm_medium: 'email',
      });
    });

    it('prefers camelCase attributionId over snake_case when both appear', () => {
      expect(
        attributionPayloadFromDeeplink(
          'metamask://connect?attributionId=win&attribution_id=lose',
        ),
      ).toEqual({ attribution_id: 'win' });
    });

    it('trims and includes all supported UTM fields when present', () => {
      expect(
        attributionPayloadFromDeeplink(
          'metamask://connect?utm_source=a+&utm_medium=b&utm_campaign=c&utm_term=d&utm_content=e',
        ),
      ).toEqual({
        utm_source: 'a',
        utm_medium: 'b',
        utm_campaign: 'c',
        utm_term: 'd',
        utm_content: 'e',
      });
    });

    it('drops empty string query values', () => {
      expect(
        attributionPayloadFromDeeplink(
          'metamask://connect?utm_source=&utm_campaign=campaign',
        ),
      ).toEqual({ utm_campaign: 'campaign' });
    });
  });

  describe('attributionPayloadFromProcessAttribution', () => {
    it('returns null when attributionId is missing and UTMs trim to empty', () => {
      expect(
        attributionPayloadFromProcessAttribution({
          utm_source: '   ',
        }),
      ).toBeNull();
    });

    it('maps non-empty trimmed attributionId to attribution_id payload key', () => {
      expect(
        attributionPayloadFromProcessAttribution({
          attributionId: '  abc  ',
          utm_source: '',
        }),
      ).toEqual({ attribution_id: 'abc' });
    });

    it('drops empty attributionId after trim so only UTMs persist', () => {
      expect(
        attributionPayloadFromProcessAttribution({
          attributionId: '   ',
          utm_source: 'x',
        }),
      ).toEqual({ utm_source: 'x' });
    });

    it('includes only non-empty trimmed UTM fields', () => {
      expect(
        attributionPayloadFromProcessAttribution({
          attributionId: 'id',
          utm_source: 's',
          utm_medium: 'm',
          utm_campaign: 'c',
          utm_term: 't',
          utm_content: 'co',
        }),
      ).toEqual({
        attribution_id: 'id',
        utm_source: 's',
        utm_medium: 'm',
        utm_campaign: 'c',
        utm_term: 't',
        utm_content: 'co',
      });
    });
  });
});
