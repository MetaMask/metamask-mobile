import { isAttributionOnlyDeeplink } from './isAttributionOnlyDeeplink';

describe('isAttributionOnlyDeeplink', () => {
  it('returns true for universal home links with UTM params', () => {
    expect(
      isAttributionOnlyDeeplink(
        'https://link.metamask.io/home?utm_source=campaign&utm_campaign=summer',
      ),
    ).toBe(true);
  });

  it('returns true for root universal links with only attribution query params', () => {
    expect(
      isAttributionOnlyDeeplink(
        'https://link.metamask.io/?utm_source=campaign&attribution_id=aid-1',
      ),
    ).toBe(true);
  });

  it('returns false for navigation deeplinks that also carry UTM params', () => {
    expect(
      isAttributionOnlyDeeplink(
        'https://link.metamask.io/rewards?utm_source=campaign&utm_campaign=summer',
      ),
    ).toBe(false);
  });

  it('returns false for perps navigation deeplinks with UTM params', () => {
    expect(
      isAttributionOnlyDeeplink(
        'https://link.metamask.io/perps?utm_source=campaign',
      ),
    ).toBe(false);
  });

  it('returns false for SDK service deeplinks even with attribution params', () => {
    expect(
      isAttributionOnlyDeeplink(
        'metamask://connect?utm_source=campaign&utm_campaign=summer',
      ),
    ).toBe(false);
  });

  it('returns false when the URL has no attributable query params', () => {
    expect(isAttributionOnlyDeeplink('https://link.metamask.io/rewards')).toBe(
      false,
    );
  });
});
