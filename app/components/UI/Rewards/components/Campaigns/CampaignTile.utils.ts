import { IconName } from '@metamask/design-system-react-native';
import {
  CampaignType,
  type CampaignDto,
  type CampaignStatus,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import I18n, { strings } from '../../../../../../locales/i18n';
import { getIntlDateTimeFormatter } from '../../../../../util/intl';

/**
 * Set of campaign types that have full UI support (details view, opt-in, etc.)
 */
const SUPPORTED_CAMPAIGN_TYPES = new Set<CampaignType>([
  CampaignType.ONDO_HOLDING,
  CampaignType.SEASON_1,
  CampaignType.PERPS_TRADING,
  CampaignType.PREDICT_THE_PITCH,
  CampaignType.MONEY_ACCOUNT_SWEEPSTAKES,
]);

/**
 * Checks if a campaign type has full UI support.
 * Campaigns without support will display as non-interactive tiles.
 *
 * @param campaignType - The type of campaign
 * @returns Whether the campaign type is fully supported
 */
export function isCampaignTypeSupported(campaignType: CampaignType): boolean {
  return SUPPORTED_CAMPAIGN_TYPES.has(campaignType);
}

/**
 * Derives the status of a campaign based on its date fields.
 *
 * Status logic:
 * - upcoming: now < startDate
 * - active: startDate <= now < endDate
 * - complete: now >= endDate
 *
 * @param campaign - The campaign data
 * @returns The derived status
 */
export function getCampaignStatus(campaign: CampaignDto): CampaignStatus {
  const now = new Date();
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
 * Resolves the campaign of a given type that a type-scoped entry point (deeplink,
 * banner) should target: the most recently started `active` campaign, or the
 * soonest `upcoming` one when none is running.
 *
 * Callers must not fall back to "first campaign of this type in API order" —
 * once a second campaign of the same type exists, that silently resolves to a
 * past one.
 *
 * @param campaigns - The full campaign list.
 * @param type - The campaign type to resolve.
 * @returns The resolved campaign, or null when only complete campaigns exist.
 */
export function getLatestActiveOrUpcomingCampaignOfType(
  campaigns: CampaignDto[],
  type: CampaignType,
): CampaignDto | null {
  const ofType = campaigns.filter((campaign) => campaign.type === type);

  const active = ofType.filter(
    (campaign) => getCampaignStatus(campaign) === 'active',
  );
  if (active.length > 0) {
    return active.reduce((latest, campaign) =>
      new Date(campaign.startDate) > new Date(latest.startDate)
        ? campaign
        : latest,
    );
  }

  const upcoming = ofType.filter(
    (campaign) => getCampaignStatus(campaign) === 'upcoming',
  );
  if (upcoming.length > 0) {
    return upcoming.reduce((soonest, campaign) =>
      new Date(campaign.startDate) < new Date(soonest.startDate)
        ? campaign
        : soonest,
    );
  }

  return null;
}

/**
 * Formats a date for display in campaign tiles (localized month and day).
 *
 * @param date - The date to format
 * @param locale - BCP 47 locale; defaults to the app locale
 * @returns Formatted date string (e.g., "March 15" in en-US)
 */
function formatCampaignDate(date: Date, locale: string = I18n.locale): string {
  return getIntlDateTimeFormatter(locale, {
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/**
 * Formats a campaign date range for draw schedule rows (e.g. "Jul 8–14").
 * Collapses the month when start and end share the same month.
 */
export function formatCampaignDateRange(
  startDate: Date | string,
  endDate: Date | string,
  locale: string = I18n.locale,
): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const sameMonth =
    start.getUTCFullYear() === end.getUTCFullYear() &&
    start.getUTCMonth() === end.getUTCMonth();

  const monthDay = getIntlDateTimeFormatter(locale, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
  const dayOnly = getIntlDateTimeFormatter(locale, {
    day: 'numeric',
    timeZone: 'UTC',
  });

  if (sameMonth) {
    return `${monthDay.format(start)}–${dayOnly.format(end)}`;
  }
  return `${monthDay.format(start)}–${monthDay.format(end)}`;
}

/**
 * Formats the status label for display in the campaign tile.
 *
 * @param status - The campaign status
 * @param campaign - The campaign data (used for date formatting)
 * @returns The formatted status label
 */
export function formatCampaignStatusLabel(
  status: CampaignStatus,
  campaign: CampaignDto,
): string {
  switch (status) {
    case 'upcoming': {
      const startDate = new Date(campaign.startDate);
      return strings('rewards.campaign.starts_date', {
        date: formatCampaignDate(startDate),
      });
    }
    case 'active': {
      const endDate = new Date(campaign.endDate);
      return strings('rewards.campaign.ends_date', {
        date: formatCampaignDate(endDate),
      });
    }
    case 'complete': {
      const endDate = new Date(campaign.endDate);
      return strings('rewards.campaign.ended_date', {
        date: formatCampaignDate(endDate),
      });
    }
    default:
      return '';
  }
}

/**
 * Gets the pill label text based on the campaign status.
 *
 * @param status - The campaign status
 * @returns The pill label text
 */
export function getCampaignPillLabel(status: CampaignStatus): string {
  switch (status) {
    case 'upcoming':
      return strings('rewards.campaign.pill_up_next');
    case 'active':
      return strings('rewards.campaign.pill_active');
    case 'complete':
      return strings('rewards.campaign.pill_complete');
    default:
      return '';
  }
}

/**
 * Gets the appropriate icon for the campaign status.
 *
 * @param status - The campaign status
 * @returns The icon name for the status
 */
function getStatusIcon(status: CampaignStatus): IconName {
  switch (status) {
    case 'active':
      return IconName.Clock;
    case 'complete':
      return IconName.Confirmation;
    case 'upcoming':
    default:
      return IconName.Speed;
  }
}

export interface CampaignStatusInfo {
  status: CampaignStatus;
  statusLabel: string;
  dateLabel: string;
  dateLabelIcon: IconName;
}

/**
 * Gets all status-related information for a campaign.
 *
 * @param campaign - The campaign data
 * @returns Object containing status, statusLabel, statusDescription, and statusDescriptionIcon
 */
export function getCampaignStatusInfo(
  campaign: CampaignDto,
): CampaignStatusInfo {
  const status = getCampaignStatus(campaign);
  return {
    status,
    statusLabel: getCampaignPillLabel(status),
    dateLabel: formatCampaignStatusLabel(status, campaign),
    dateLabelIcon: getStatusIcon(status),
  };
}
