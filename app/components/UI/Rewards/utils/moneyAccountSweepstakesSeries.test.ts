import {
  CampaignType,
  type CampaignDto,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import {
  buildMoneyAccountSweepstakesTileCampaign,
  getMoneyAccountSweepstakesSeries,
  getMoneyAccountSweepstakesWeekNumber,
  resolveMoneyAccountSweepstakesEntryRoute,
} from './moneyAccountSweepstakesSeries';

const buildCampaign = (
  overrides: Partial<CampaignDto> & {
    id: string;
    startDate: string;
    endDate: string;
  },
): CampaignDto =>
  ({
    type: CampaignType.MONEY_ACCOUNT_SWEEPSTAKES,
    name: 'Money Account Sweepstakes',
    termsAndConditions: null,
    excludedRegions: ['GB', 'US-NY', 'US-FL'],
    image: null,
    details: null,
    featured: false,
    showUpcomingDate: false,
    ...overrides,
  }) as CampaignDto;

const withTour = (campaign: CampaignDto): CampaignDto =>
  ({
    ...campaign,
    details: {
      ...(campaign.details ?? {}),
      howItWorks: {
        tour: [{ title: 'Step 1', description: 'Description 1' }],
      },
    },
  }) as CampaignDto;

describe('moneyAccountSweepstakesSeries', () => {
  const week1 = buildCampaign({
    id: 'week-1',
    startDate: '2026-07-01T00:00:00.000Z',
    endDate: '2026-07-08T00:00:00.000Z',
  });
  const week2 = buildCampaign({
    id: 'week-2',
    startDate: '2026-07-08T00:00:00.000Z',
    endDate: '2026-07-15T00:00:00.000Z',
  });
  const week3 = buildCampaign({
    id: 'week-3',
    startDate: '2026-07-15T00:00:00.000Z',
    endDate: '2026-07-22T00:00:00.000Z',
  });

  it('returns empty series when no sweepstakes campaigns exist', () => {
    const series = getMoneyAccountSweepstakesSeries([]);
    expect(series.campaigns).toEqual([]);
    expect(series.seriesStatus).toBeNull();
    expect(buildMoneyAccountSweepstakesTileCampaign(series)).toBeNull();
  });

  it('sorts by startDate and reports upcoming before the first start', () => {
    const series = getMoneyAccountSweepstakesSeries(
      [week2, week1, week3],
      new Date('2026-06-30T12:00:00.000Z'),
    );
    expect(series.campaigns.map((c) => c.id)).toEqual([
      'week-1',
      'week-2',
      'week-3',
    ]);
    expect(series.seriesStatus).toBe('upcoming');
    expect(series.displayCampaign?.id).toBe('week-1');
    expect(series.activeCampaign).toBeNull();
  });

  it('reports active when any week is in progress and picks that week as display', () => {
    const series = getMoneyAccountSweepstakesSeries(
      [week1, week2, week3],
      new Date('2026-07-10T12:00:00.000Z'),
    );
    expect(series.seriesStatus).toBe('active');
    expect(series.activeCampaign?.id).toBe('week-2');
    expect(series.displayCampaign?.id).toBe('week-2');
  });

  it('reports previous after the last end and displays the last campaign', () => {
    const series = getMoneyAccountSweepstakesSeries(
      [week1, week2, week3],
      new Date('2026-07-23T00:00:00.000Z'),
    );
    expect(series.seriesStatus).toBe('previous');
    expect(series.displayCampaign?.id).toBe('week-3');
  });

  it('builds a tile campaign spanning the full series date range', () => {
    const series = getMoneyAccountSweepstakesSeries(
      [week1, week2, week3],
      new Date('2026-07-10T12:00:00.000Z'),
    );
    const tile = buildMoneyAccountSweepstakesTileCampaign(series);
    expect(tile?.id).toBe('week-2');
    expect(tile?.startDate).toBe(week1.startDate);
    expect(tile?.endDate).toBe(week3.endDate);
  });

  it('returns 1-based week numbers', () => {
    const series = getMoneyAccountSweepstakesSeries([week1, week2, week3]);
    expect(
      getMoneyAccountSweepstakesWeekNumber(series.campaigns, 'week-1'),
    ).toBe(1);
    expect(
      getMoneyAccountSweepstakesWeekNumber(series.campaigns, 'week-3'),
    ).toBe(3);
    expect(
      getMoneyAccountSweepstakesWeekNumber(series.campaigns, 'missing'),
    ).toBe(0);
  });

  describe('resolveMoneyAccountSweepstakesEntryRoute', () => {
    it('returns dashboard when there are no sweepstakes campaigns', () => {
      const series = getMoneyAccountSweepstakesSeries([]);
      expect(
        resolveMoneyAccountSweepstakesEntryRoute({
          series,
          optedInAny: false,
        }),
      ).toEqual({ kind: 'dashboard' });
    });

    it('returns dashboard when the series is upcoming', () => {
      const series = getMoneyAccountSweepstakesSeries(
        [week1, week2, week3],
        new Date('2026-06-30T12:00:00.000Z'),
      );
      expect(
        resolveMoneyAccountSweepstakesEntryRoute({
          series,
          optedInAny: false,
        }),
      ).toEqual({ kind: 'dashboard' });
    });

    it('returns details for the last campaign when the series is previous', () => {
      const series = getMoneyAccountSweepstakesSeries(
        [week1, week2, week3],
        new Date('2026-07-23T12:00:00.000Z'),
      );
      expect(
        resolveMoneyAccountSweepstakesEntryRoute({
          series,
          optedInAny: false,
        }),
      ).toEqual({ kind: 'details', campaignId: 'week-3' });
    });

    it('returns tour for the active campaign when eligible', () => {
      const series = getMoneyAccountSweepstakesSeries(
        [week1, withTour(week2), week3],
        new Date('2026-07-10T12:00:00.000Z'),
      );
      expect(
        resolveMoneyAccountSweepstakesEntryRoute({
          series,
          optedInAny: false,
        }),
      ).toEqual({ kind: 'tour', campaignId: 'week-2' });
    });

    it('returns details for the active campaign when already opted in', () => {
      const series = getMoneyAccountSweepstakesSeries(
        [week1, withTour(week2), week3],
        new Date('2026-07-10T12:00:00.000Z'),
      );
      expect(
        resolveMoneyAccountSweepstakesEntryRoute({
          series,
          optedInAny: true,
        }),
      ).toEqual({ kind: 'details', campaignId: 'week-2' });
    });

    it('returns details for the active campaign when there is no tour', () => {
      const series = getMoneyAccountSweepstakesSeries(
        [week1, week2, week3],
        new Date('2026-07-10T12:00:00.000Z'),
      );
      expect(
        resolveMoneyAccountSweepstakesEntryRoute({
          series,
          optedInAny: false,
        }),
      ).toEqual({ kind: 'details', campaignId: 'week-2' });
    });
  });
});
