import { getLeagueConfig } from './sportLeagueConfigs';
import PredictSportTeamHelmet from '../components/PredictSportTeamHelmet/PredictSportTeamHelmet';
import PredictSportFootballIcon from '../components/PredictSportFootballIcon/PredictSportFootballIcon';
import { PredictSportsLeague } from '../types';

describe('sportLeagueConfigs', () => {
  describe('getLeagueConfig', () => {
    it('returns NFL config with TeamIcon and PossessionIcon', () => {
      const config = getLeagueConfig('nfl');

      expect(config.TeamIcon).toBe(PredictSportTeamHelmet);
      expect(config.PossessionIcon).toBe(PredictSportFootballIcon);
    });

    it('returns empty config for NBA (uses defaults)', () => {
      const config = getLeagueConfig('nba');

      expect(config.TeamIcon).toBeUndefined();
      expect(config.PossessionIcon).toBeUndefined();
    });

    it('returns empty config for unknown leagues', () => {
      const config = getLeagueConfig('mlb' as PredictSportsLeague);

      expect(config.TeamIcon).toBeUndefined();
      expect(config.PossessionIcon).toBeUndefined();
    });
  });
});
