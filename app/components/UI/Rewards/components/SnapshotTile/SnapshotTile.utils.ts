import { IconName } from '@metamask/design-system-react-native';
import type {
  SnapshotDto,
  SnapshotStatus,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import { strings } from '../../../../../../locales/i18n';

/**
 * Derives the status of a snapshot based on its date fields.
 *
 * Status logic:
 * - upcoming: now < opensAt
 * - live: opensAt <= now < closesAt
 * - calculating: closesAt <= now && !calculatedAt
 * - distributing: calculatedAt && !distributedAt
 * - complete: distributedAt is set
 *
 * @param snapshot - The snapshot data
 * @returns The derived status
 */
export function getSnapshotStatus(snapshot: SnapshotDto): SnapshotStatus {
  const now = new Date();
  const opensAt = new Date(snapshot.opensAt);
  const closesAt = new Date(snapshot.closesAt);

  // Check if distribution is complete
  if (snapshot.distributedAt) {
    return 'complete';
  }

  // Check if results are calculated but not distributed yet
  if (snapshot.calculatedAt) {
    return 'distributing';
  }

  // Check if snapshot is still upcoming
  if (now < opensAt) {
    return 'upcoming';
  }

  // Check if snapshot is currently live
  if (now >= opensAt && now < closesAt) {
    return 'live';
  }

  // Snapshot has closed but results not calculated yet
  return 'calculating';
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
    case 'upcoming': {
      const opensAt = new Date(snapshot.opensAt);
      return strings('rewards.snapshot.starts_date', {
        date: formatSnapshotDate(opensAt),
      });
    }
    case 'live': {
      const closesAt = new Date(snapshot.closesAt);
      return strings('rewards.snapshot.ends_date', {
        date: formatSnapshotDate(closesAt),
      });
    }
    case 'calculating':
      return strings('rewards.snapshot.results_coming_soon');
    case 'distributing':
      return strings('rewards.snapshot.tokens_on_the_way');
    case 'complete': {
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
    case 'upcoming':
      return strings('rewards.snapshot.pill_up_next');
    case 'live':
      return strings('rewards.snapshot.pill_live_now');
    case 'calculating':
      return strings('rewards.snapshot.pill_calculating');
    case 'distributing':
      return strings('rewards.snapshot.pill_results_ready');
    case 'complete':
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
    case 'live':
      return IconName.Clock;
    case 'complete':
      return IconName.Confirmation;
    case 'calculating':
      return IconName.Loading;
    case 'distributing':
      return IconName.Send;
    case 'upcoming':
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
  const status = getSnapshotStatus(snapshot);
  return {
    status,
    statusLabel: getSnapshotPillLabel(status),
    statusDescription: formatSnapshotStatusLabel(status, snapshot),
    statusDescriptionIcon: getStatusIcon(status),
  };
}
