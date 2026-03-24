/**
 * Shared type definitions for the quality gates module.
 */

/**
 * Minimal interface for timer objects consumed by the validator.
 * Compatible with TimerHelper without importing it directly.
 */
export interface TimerLike {
  id: string;
  threshold: number | null;
  baseThreshold: number | null;
  hasThreshold(): boolean;
  getDuration(): number | null;
}

export interface StepResult {
  index: number;
  name: string;
  duration: number;
  threshold: number | null;
  baseThreshold: number | null;
  passed: boolean;
  exceeded: number | null;
  percentOver: string | null;
}

export interface TotalResult {
  duration: number;
  threshold: number;
  passed: boolean;
  exceeded: number | null;
  percentOver: string | null;
}

export interface StepViolation {
  type: 'step';
  stepIndex: number;
  stepName: string;
  actual: number;
  threshold: number;
  baseThreshold: number | null;
  exceeded: number;
  percentOver: string;
  message: string;
}

export interface TotalViolation {
  type: 'total';
  actual: number;
  threshold: number;
  exceeded: number;
  percentOver: string;
  message: string;
}

export type Violation = StepViolation | TotalViolation;

export interface QualityGatesSummary {
  testName: string;
  message?: string;
  totalSteps?: number;
  passedSteps?: number;
  failedSteps?: number;
  totalDurationMs?: number;
  totalThreshold?: number | null;
}

export interface QualityGatesResult {
  passed: boolean;
  hasThresholds: boolean;
  steps: StepResult[];
  totalResult: TotalResult | null;
  violations: Violation[];
  summary: QualityGatesSummary;
}

export interface MetricStep {
  name: string;
  duration: number;
  threshold: number | null;
  baseThreshold: number | null;
}
