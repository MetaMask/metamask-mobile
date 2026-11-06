import type { PredictTeam, PredictTeamLogoFacing } from '../../types';
import { getMatchupSlot, shouldMirrorTeamLogo } from './shouldMirrorTeamLogo';

const createTeam = (logoFacing?: PredictTeamLogoFacing): PredictTeam => ({
  name: 'Arizona Cardinals',
  logoFacing,
});

describe('getMatchupSlot', () => {
  it('puts the first Team on the left and the second on the right', () => {
    const order = ['home', 'away'] as const;

    expect(getMatchupSlot(order, 'home')).toBe('left');
    expect(getMatchupSlot(order, 'away')).toBe('right');
  });
});

describe('shouldMirrorTeamLogo', () => {
  it.each([
    ['left', 'left', true],
    ['left', 'right', false],
    ['right', 'right', true],
    ['right', 'left', false],
  ] as const)(
    'in the %s slot, a logo facing %s is mirrored: %s',
    (slot, logoFacing, expected) => {
      const team = createTeam(logoFacing);

      const result = shouldMirrorTeamLogo(team, slot);

      expect(result).toBe(expected);
    },
  );

  it.each(['left', 'right'] as const)(
    'never mirrors a logo without a facing in the %s slot',
    (slot) => {
      const team = createTeam();

      const result = shouldMirrorTeamLogo(team, slot);

      expect(result).toBe(false);
    },
  );
});
