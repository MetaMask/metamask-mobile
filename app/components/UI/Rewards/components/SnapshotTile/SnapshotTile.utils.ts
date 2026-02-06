import { IconName } from '@metamask/design-system-react-native';
import {
  SnapshotStatus,
  type SnapshotDto,
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
 * Formats the date for display in the snapshot tile.
 *
 * @param date - The date to format
 * @returns Formatted date string (e.g., "Mar 15, 2:30 PM")
 */
function formatSnapshotDate(date: Date): string {
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
 * Formats the status label for display in the snapshot tile.
 *
 * @param status - The snapshot status
 * @param snapshot - The snapshot data (used for date formatting)
 * @returns The formatted status label
 */
export function formatSnapshotStatusLabel(
  status: SnapshotStatus,
  snapshot: SnapshotDto,
): string {
  switch (status) {
    case SnapshotStatus.UPCOMING: {
      const opensAt = new Date(snapshot.opensAt);
      return strings('rewards.snapshot.starts_date', {
        date: formatSnapshotDate(opensAt),
      });
    }
    case SnapshotStatus.OPEN: {
      const closesAt = new Date(snapshot.closesAt);
      return strings('rewards.snapshot.ends_date', {
        date: formatSnapshotDate(closesAt),
      });
    }
    case SnapshotStatus.CLOSED:
      return strings('rewards.snapshot.results_coming_soon');
    case SnapshotStatus.CALCULATED:
      return strings('rewards.snapshot.tokens_on_the_way');
    case SnapshotStatus.DISTRIBUTED: {
      const distributedAt = snapshot.distributedAt
        ? new Date(snapshot.distributedAt)
        : new Date();
      return formatSnapshotDate(distributedAt);
    }
    default:
      return '';
  }
}

/**
 * Gets the pill label text based on the snapshot status.
 *
 * @param status - The snapshot status
 * @returns The pill label text
 */
export function getSnapshotPillLabel(status: SnapshotStatus): string {
  switch (status) {
    case SnapshotStatus.UPCOMING:
      return strings('rewards.snapshot.pill_up_next');
    case SnapshotStatus.OPEN:
      return strings('rewards.snapshot.pill_live_now');
    case SnapshotStatus.CLOSED:
      return strings('rewards.snapshot.pill_calculating');
    case SnapshotStatus.CALCULATED:
      return strings('rewards.snapshot.pill_results_ready');
    case SnapshotStatus.DISTRIBUTED:
      return strings('rewards.snapshot.pill_complete');
    default:
      return '';
  }
}

/**
 * Gets the appropriate icon for the status
 *
 * @param status - The snapshot status
 * @returns The icon name for the status
 */
function getStatusIcon(status: SnapshotStatus): IconName {
  switch (status) {
    case SnapshotStatus.OPEN:
      return IconName.Clock;
    case SnapshotStatus.DISTRIBUTED:
      return IconName.Confirmation;
    case SnapshotStatus.CLOSED:
      return IconName.Loading;
    case SnapshotStatus.CALCULATED:
      return IconName.Send;
    case SnapshotStatus.UPCOMING:
    default:
      return IconName.Speed;
  }
}

export interface SnapshotStatusInfo {
  status: SnapshotStatus;
  statusLabel: string;
  statusDescription: string;
  statusDescriptionIcon: IconName;
}

/**
 * Gets all status-related information for a snapshot.
 *
 * @param snapshot - The snapshot data
 * @returns Object containing status, statusLabel, statusDescription, and statusDescriptionIcon
 */
export function getSnapshotStatusInfo(
  snapshot: SnapshotDto,
): SnapshotStatusInfo {
  return {
    status: snapshot.status,
    statusLabel: getSnapshotPillLabel(snapshot.status),
    statusDescription: formatSnapshotStatusLabel(snapshot.status, snapshot),
    statusDescriptionIcon: getStatusIcon(snapshot.status),
  };
}
