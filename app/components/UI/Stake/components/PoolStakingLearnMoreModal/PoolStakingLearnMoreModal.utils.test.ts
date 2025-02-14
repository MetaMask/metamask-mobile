import { strings } from '../../../../../../locales/i18n';
import { MOCK_VAULT_APY_AVERAGES } from './mockVaultRewards';
import { parseVaultApyAveragesResponse } from './PoolStakingLearnMoreModal.utils';

describe('PoolStakingLearnMoreModal Utils', () => {
  describe('parseVaultApyAveragesResponse', () => {
    it('parses the VaultApyAverageResponse', () => {
      const result = parseVaultApyAveragesResponse(MOCK_VAULT_APY_AVERAGES);

      expect(result).toEqual({
        '1': {
          apyAverage: '3.047713358665092375',
          numDays: 1,
          label: strings('stake.today'),
        },
        '7': {
          apyAverage: '3.25756026351317301786',
          numDays: 7,
          label: strings('stake.one_week_average'),
        },
        '30': {
          apyAverage: '3.25616054301749304217',
          numDays: 30,
          label: strings('stake.one_month_average'),
        },
        '90': {
          apyAverage: '3.31863306662107446672',
          numDays: 90,
          label: strings('stake.three_month_average'),
        },
        '180': {
          apyAverage: '3.05557344496273894133',
          numDays: 180,
          label: strings('stake.six_month_average'),
        },
        '365': {
          apyAverage: '0',
          numDays: 365,
          label: strings('stake.one_year_average'),
        },
      });
    });
  });
});
