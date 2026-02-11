import { IconName } from '@metamask/design-system-react-native';
import {
  DropStatus,
  type SeasonDropDto,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import { strings } from '../../../../../../locales/i18n';

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
 * Formats the date for display in the drop tile.
 *
 * @param date - The date to format
 * @returns Formatted date string (e.g., "Mar 15, 2:30 PM")
 */
function formatDropDate(date: Date): string {
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
 * Formats the status label for display in the drop tile.
 *
 * @param status - The drop status
 * @param drop - The drop data (used for date formatting)
 * @returns The formatted status label
 */
export function formatDropStatusLabel(
  status: DropStatus,
  drop: SeasonDropDto,
): string {
  switch (status) {
    case DropStatus.UPCOMING: {
      const opensAt = new Date(drop.opensAt);
      return strings('rewards.drop.starts_date', {
        date: formatDropDate(opensAt),
      });
    }
    case DropStatus.OPEN: {
      const closesAt = new Date(drop.closesAt);
      return strings('rewards.drop.ends_date', {
        date: formatDropDate(closesAt),
      });
    }
    case DropStatus.CLOSED:
      return strings('rewards.drop.results_coming_soon');
    case DropStatus.CALCULATED:
      return strings('rewards.drop.tokens_on_the_way');
    case DropStatus.DISTRIBUTED: {
      const distributedAt = drop.distributedAt
        ? new Date(drop.distributedAt)
        : new Date();
      return formatDropDate(distributedAt);
    }
    default:
      return '';
  }
}

/**
 * Gets the pill label text based on the drop status.
 *
 * @param status - The drop status
 * @returns The pill label text
 */
export function getDropPillLabel(status: DropStatus): string {
  switch (status) {
    case DropStatus.UPCOMING:
      return strings('rewards.drop.pill_up_next');
    case DropStatus.OPEN:
      return strings('rewards.drop.pill_live_now');
    case DropStatus.CLOSED:
      return strings('rewards.drop.pill_calculating');
    case DropStatus.CALCULATED:
      return strings('rewards.drop.pill_results_ready');
    case DropStatus.DISTRIBUTED:
      return strings('rewards.drop.pill_complete');
    default:
      return '';
  }
}

/**
 * Gets the appropriate icon for the status
 *
 * @param status - The drop status
 * @returns The icon name for the status
 */
function getStatusIcon(status: DropStatus): IconName {
  switch (status) {
    case DropStatus.OPEN:
      return IconName.Clock;
    case DropStatus.DISTRIBUTED:
      return IconName.Confirmation;
    case DropStatus.CLOSED:
      return IconName.Loading;
    case DropStatus.CALCULATED:
      return IconName.Send;
    case DropStatus.UPCOMING:
    default:
      return IconName.Speed;
  }
}

export interface DropStatusInfo {
  status: DropStatus;
  statusLabel: string;
  statusDescription: string;
  statusDescriptionIcon: IconName;
}

/**
 * Gets all status-related information for a drop.
 *
 * @param drop - The drop data
 * @returns Object containing status, statusLabel, statusDescription, and statusDescriptionIcon
 */
export function getDropStatusInfo(drop: SeasonDropDto): DropStatusInfo {
  return {
    status: drop.status,
    statusLabel: getDropPillLabel(drop.status),
    statusDescription: formatDropStatusLabel(drop.status, drop),
    statusDescriptionIcon: getStatusIcon(drop.status),
  };
}
