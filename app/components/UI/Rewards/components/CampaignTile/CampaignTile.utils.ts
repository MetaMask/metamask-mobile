import { IconName } from '@metamask/design-system-react-native';
import type {
  CampaignDto,
  CampaignStatus,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import { strings } from '../../../../../../locales/i18n';

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

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * Formats a date for display in campaign tiles.
 *
 * @param date - The date to format
 * @returns Formatted date string (e.g., "Mar 15, 2:30 PM")
 */
function formatCampaignDate(date: Date): string {
  const month = MONTHS[date.getMonth()];
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();

  const hour12 = hours % 12 || 12;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const paddedMinutes = minutes.toString().padStart(2, '0');

  return `${month} ${day}, ${hour12}:${paddedMinutes} ${ampm}`;
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
      return formatCampaignDate(endDate);
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
  statusDescription: string;
  statusDescriptionIcon: IconName;
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
    statusDescription: formatCampaignStatusLabel(status, campaign),
    statusDescriptionIcon: getStatusIcon(status),
  };
}
