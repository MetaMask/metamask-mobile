import { ImpactMoment } from './catalog';
import { IMPACT_STYLE_MAP } from './vendorPlayback';

describe('IMPACT_STYLE_MAP', () => {
  it('gives each Gacha reveal rarity its own impact style', () => {
    const styles = [
      ImpactMoment.GachaRevealCommon,
      ImpactMoment.GachaRevealUncommon,
      ImpactMoment.GachaRevealRare,
      ImpactMoment.GachaRevealEpic,
    ].map((moment) => IMPACT_STYLE_MAP[moment]);

    const distinctStyles = new Set(styles);

    expect(distinctStyles.size).toBe(styles.length);
  });
});
