import {
  Side,
  type OrderPreview,
  type PredictExecutionMetadata,
  type PredictExecutionPreviewResult,
} from '../types';

export type ExecutablePredictExecutionResult = Extract<
  PredictExecutionPreviewResult,
  { status: 'executable' }
>;

/** Creates a fresh sell preview for Predict execution-flow tests. */
export function createPredictExecutionPreview(
  overrides: Partial<OrderPreview> = {},
): OrderPreview {
  return {
    marketId: 'market-1',
    outcomeId: 'outcome-1',
    outcomeTokenId: 'token-1',
    timestamp: 1,
    side: Side.SELL,
    sharePrice: 0.49,
    maxAmountSpent: 10,
    minAmountReceived: 4.9,
    slippage: 0.05,
    tickSize: 0.01,
    minOrderSize: 1,
    negRisk: false,
    fetchedAt: Date.now(),
    ...overrides,
  };
}

/** Creates fresh-book execution facts for Predict execution-flow tests. */
export function createPredictExecutionMetadata(
  overrides: Partial<PredictExecutionMetadata> = {},
): PredictExecutionMetadata {
  return {
    fetchedAt: Date.now(),
    requestedSize: 10,
    executableSize: 10,
    approvedPrice: 0.5,
    refreshedPrice: 0.49,
    bandFloorPrice: 0.48,
    worstExecutablePrice: 0.49,
    tickSize: 0.01,
    ...overrides,
  };
}

/** Creates the executable member of a Predict execution-preview result. */
export function createExecutablePredictExecutionResult(overrides?: {
  preview?: OrderPreview;
  execution?: PredictExecutionMetadata;
}): ExecutablePredictExecutionResult {
  return {
    status: 'executable',
    preview: overrides?.preview ?? createPredictExecutionPreview(),
    execution: overrides?.execution ?? createPredictExecutionMetadata(),
  };
}
