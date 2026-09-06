import type { ActivityKind } from './types';

const PREDICT_PROVIDER_ACTIVITY_KINDS = new Set<ActivityKind>([
  'predictionPlaced',
  'predictionCashedOut',
  'predictionClaimWinnings',
]);

export function isPredictProviderActivityKind(kind: ActivityKind): boolean {
  return PREDICT_PROVIDER_ACTIVITY_KINDS.has(kind);
}
