import { IconName } from '@metamask/design-system-react-native';
import {
  CampaignType,
  type CampaignDto,
  type CampaignStatus,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import { strings } from '../../../../../../locales/i18n';

/**
 * Set of campaign types that have full UI support (details view, opt-in, etc.)
 */
const SUPPORTED_CAMPAIGN_TYPES = new Set<CampaignType>([
  CampaignType.ONDO_HOLDING,
  CampaignType.SEASON_1,
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
 * Whether the user may still opt in to the campaign.
 * Opt-in is only possible while {@link getCampaignStatus} returns `'active'` (between
 * `startDate` and `endDate`). For {@link CampaignType.ONDO_HOLDING}, opt-in also closes after
 * `details.depositCutoffDate` (ISO 8601) when that date is present and valid.
 *
 * @param campaign - Campaign data from the API
 * @returns `true` if opt-in is allowed; `false` if the campaign is not active or the deposit cutoff has passed
 */
export function isOptinAllowed(campaign: CampaignDto): boolean {
  if (getCampaignStatus(campaign) !== 'active') {
    return false;
  }

  if (campaign.type !== CampaignType.ONDO_HOLDING) {
    return true;
  }

  const cutoff = campaign.details?.depositCutoffDate;
  if (!cutoff) {
    return true;
  }

  const cutoffMs = new Date(cutoff).getTime();

  return Date.now() <= cutoffMs;
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * Formats a date for display in campaign tiles.
 *
 * @param date - The date to format
 * @returns Formatted date string (e.g., "March 15")
 */
function formatCampaignDate(date: Date): string {
  const month = MONTHS[date.getMonth()];
  const day = date.getDate();

  return `${month} ${day}`;
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
