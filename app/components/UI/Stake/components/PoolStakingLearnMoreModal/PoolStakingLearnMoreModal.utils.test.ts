import { MOCK_VAULT_APRS } from './mockVaultRewards';
import { parseVaultTimespanAprsResponse } from './PoolStakingLearnMoreModal.utils';

describe('PoolStakingLearnMoreModal Utils', () => {
  describe('parseVaultTimespanAprsResponse', () => {
    it('parses the VaultTimespanAprsResponse', () => {
      const result = parseVaultTimespanAprsResponse(MOCK_VAULT_APRS);

      expect(result).toEqual({
        '1': { apr: '3.047713358665092375', numDays: 1, label: 'Today' },
        '7': {
          apr: '3.25756026351317301786',
          numDays: 7,
          label: '1 week average',
        },
        '30': {
          apr: '3.25616054301749304217',
          numDays: 30,
          label: '1 month average',
        },
        '90': {
          apr: '3.31863306662107446672',
          numDays: 90,
          label: '3 month average',
        },
        '180': {
          apr: '3.05557344496273894133',
          numDays: 180,
          label: '6 month average',
        },
        '365': { apr: '0', numDays: 365, label: '1 year average' },
      });
    });
  });
});
