import { ImpactMoment } from './catalog';
import { IMPACT_STYLE_MAP } from './vendorPlayback';

describe('IMPACT_STYLE_MAP', () => {
  it('gives each Collectibles reveal rarity its own impact style', () => {
    const styles = [
      ImpactMoment.CollectiblesRevealCommon,
      ImpactMoment.CollectiblesRevealUncommon,
      ImpactMoment.CollectiblesRevealRare,
      ImpactMoment.CollectiblesRevealEpic,
    ].map((moment) => IMPACT_STYLE_MAP[moment]);

    const distinctStyles = new Set(styles);

    expect(distinctStyles.size).toBe(styles.length);
  });
});
