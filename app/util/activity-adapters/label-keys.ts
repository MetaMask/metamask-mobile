/**
 * Vendored from metamask-extension shared/lib/activity/label-keys.ts
 * Branch: origin/n3ps/activity-v3-prototype
 * TODO: Replace with shared @metamask/activity-adapters package when published.
 */
import type { ActivityKind, Status } from './types';

const fallbackLabelKey = 'activity_fallback';

export function getLabelKeys({
  type,
  status,
}: {
  type: ActivityKind;
  status: Status;
}) {
  const key = type && status ? `activity_${type}_${status}` : fallbackLabelKey;

  return {
    title: {
      key: `${key}_title`,
    },
    description: {
      key: `${key}_description`,
    },
  };
}
