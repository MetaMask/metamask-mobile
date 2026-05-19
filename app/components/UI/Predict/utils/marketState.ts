export const PENDING_RESOLUTION_STATUSES = new Set([
  'proposed',
  'proposed_resolution',
  'disputed',
  'in_dispute',
]);

export const FINAL_RESOLUTION_STATUSES = new Set([
  'resolved',
  'finalized',
  'finalized_resolution',
  'closed',
]);

export const normalizeResolutionStatus = (resolutionStatus?: string) =>
  resolutionStatus
    ?.trim()
    .toLowerCase()
    .replace(/[\s-]+/gu, '_');
