import { getSocialFooterDurations } from './socialFooterMotion';

describe('getSocialFooterDurations', () => {
  it('keeps the full morph when hardware or network is unknown', () => {
    expect(getSocialFooterDurations(null, null, false)).toEqual({
      collapse: 280,
      hold: 40,
      expand: 340,
    });
    expect(getSocialFooterDurations('LOW', null, false).collapse).toBe(280);
    expect(getSocialFooterDurations(null, 'WIFI', false).expand).toBe(340);
  });

  it('shortens the morph on low hardware with a known network', () => {
    expect(getSocialFooterDurations('LOW', 'WIFI', false)).toEqual({
      collapse: 140,
      hold: 0,
      expand: 160,
    });
    expect(getSocialFooterDurations('LOW', 'NONE', false).collapse).toBe(140);
  });

  it('skips the morph when reduced motion is on', () => {
    expect(getSocialFooterDurations('HIGH', 'WIFI', true)).toEqual({
      collapse: 0,
      hold: 0,
      expand: 0,
    });
  });
});
