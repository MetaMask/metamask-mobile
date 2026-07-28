import {
  CampaignType,
  type CampaignDto,
  type CampaignStatus,
} from '../../../../core/Engine/controllers/rewards-controller/types';

export type MoneyAccountSweepstakesSeriesStatus =
  | 'upcoming'
  | 'active'
  | 'previous';

export interface MoneyAccountSweepstakesSeries {
  campaigns: CampaignDto[];
  first: CampaignDto | null;
  last: CampaignDto | null;
  activeCampaign: CampaignDto | null;
  displayCampaign: CampaignDto | null;
  seriesStatus: MoneyAccountSweepstakesSeriesStatus | null;
}

function getStatusAt(campaign: CampaignDto, now: Date): CampaignStatus {
  const startDate = new Date(campaign.startDate);
  const endDate = new Date(campaign.endDate);

  if (now < startDate) {
    return 'upcoming';
  }
  if (now >= startDate && now < endDate) {
    return 'active';
  }
  return 'complete';
}

/**
 * Collapse consecutive MONEY_ACCOUNT_SWEEPSTAKES campaigns into one series view model.
 * Campaigns are sorted by startDate ascending.
 */
export function getMoneyAccountSweepstakesSeries(
  campaigns: CampaignDto[],
  now: Date = new Date(),
): MoneyAccountSweepstakesSeries {
  const sorted = campaigns
    .filter((c) => c.type === CampaignType.MONEY_ACCOUNT_SWEEPSTAKES)
    .slice()
    .sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );

  if (sorted.length === 0) {
    return {
      campaigns: [],
      first: null,
      last: null,
      activeCampaign: null,
      displayCampaign: null,
      seriesStatus: null,
    };
  }

  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const activeCampaign =
    sorted.find((c) => getStatusAt(c, now) === 'active') ?? null;

  let seriesStatus: MoneyAccountSweepstakesSeriesStatus;
  if (now < new Date(first.startDate)) {
    seriesStatus = 'upcoming';
  } else if (now >= new Date(last.endDate)) {
    seriesStatus = 'previous';
  } else {
    seriesStatus = 'active';
  }

  const displayCampaign =
    activeCampaign ?? (seriesStatus === 'previous' ? last : first);

  return {
    campaigns: sorted,
    first,
    last,
    activeCampaign,
    displayCampaign,
    seriesStatus,
  };
}

/**
 * Synthesize a single tile campaign spanning the full series date range.
 */
export function buildMoneyAccountSweepstakesTileCampaign(
  series: MoneyAccountSweepstakesSeries,
): CampaignDto | null {
  if (!series.displayCampaign || !series.first || !series.last) {
    return null;
  }

  return {
    ...series.displayCampaign,
    startDate: series.first.startDate,
    endDate: series.last.endDate,
  };
}

/**
 * 1-based week index of a campaign within the sorted series.
 */
export function getMoneyAccountSweepstakesWeekNumber(
  seriesCampaigns: CampaignDto[],
  campaignId: string,
): number {
  const index = seriesCampaigns.findIndex((c) => c.id === campaignId);
  return index >= 0 ? index + 1 : 0;
}

export function mapSeriesStatusToCampaignStatus(
  seriesStatus: MoneyAccountSweepstakesSeriesStatus,
): CampaignStatus {
  if (seriesStatus === 'previous') {
    return 'complete';
  }
  return seriesStatus;
}
