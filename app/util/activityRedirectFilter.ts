import type { ActivityTypeFilter } from './activityFilters';

let pendingActivityTypeFilter: ActivityTypeFilter | undefined;

export function setPendingActivityTypeFilter(filter: ActivityTypeFilter): void {
  pendingActivityTypeFilter = filter;
}

export function getPendingActivityTypeFilter(): ActivityTypeFilter | undefined {
  return pendingActivityTypeFilter;
}

export function clearPendingActivityTypeFilter(): void {
  pendingActivityTypeFilter = undefined;
}
