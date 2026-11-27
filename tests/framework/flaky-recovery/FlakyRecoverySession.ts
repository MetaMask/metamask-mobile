import type { FlakyRecoveryLimits } from './FlakyRecoveryConfig.ts';
import type {
  AppliedFlakyFix,
  FlakyFixExecutor,
  FlakyRecoveryProvider,
  FlakyRecoveryRecord,
  FlakyRecoveryScreenshots,
  FlakyStep,
} from './FlakyRecoveryTypes.ts';

export interface FlakyRecoveryRuntimeOptions {
  provider: FlakyRecoveryProvider;
  executor: FlakyFixExecutor;
  limits: FlakyRecoveryLimits;
  test: FlakyRecoveryRecord['test'];
  /** Reports a recovery once the retried step has passed. */
  onRecovered: (
    record: FlakyRecoveryRecord,
    screenshots: FlakyRecoveryScreenshots,
  ) => Promise<void> | void;
}

/**
 * Per-test state of AI flaky recovery: the model, the device actions, the
 * budget, and the sink that marks the test as recovered. Created by the
 * Playwright fixture for each test and handed to the interrupting-screen guard.
 */
export class FlakyRecoveryRuntime {
  readonly provider: FlakyRecoveryProvider;
  readonly executor: FlakyFixExecutor;
  readonly limits: FlakyRecoveryLimits;
  readonly #test: FlakyRecoveryRecord['test'];
  readonly #onRecovered: FlakyRecoveryRuntimeOptions['onRecovered'];
  #diagnoses = 0;
  #recoveries = 0;

  constructor(options: FlakyRecoveryRuntimeOptions) {
    this.provider = options.provider;
    this.executor = options.executor;
    this.limits = options.limits;
    this.#test = options.test;
    this.#onRecovered = options.onRecovered;
  }

  get recoveries(): number {
    return this.#recoveries;
  }

  canRecover(): boolean {
    return this.#recoveries < this.limits.maxRecoveriesPerTest;
  }

  canDiagnose(): boolean {
    return this.#diagnoses < this.limits.maxDiagnosesPerTest;
  }

  noteDiagnosis(): void {
    this.#diagnoses += 1;
  }

  /**
   * Counts a recovery whose retried step passed and hands the record to the
   * reporting sink. Sink failures never fail the test.
   */
  async recordRecovery(
    step: FlakyStep,
    applied: AppliedFlakyFix,
    screenshots: FlakyRecoveryScreenshots,
  ): Promise<FlakyRecoveryRecord> {
    this.#recoveries += 1;
    const record: FlakyRecoveryRecord = {
      schemaVersion: 1,
      test: this.#test,
      recoveryIndex: this.#recoveries,
      step: {
        kind: step.kind,
        intent: step.intent,
        targetDescriptors: step.targetDescriptors,
      },
      originalError: step.errorMessage,
      source: applied.source,
      cause: applied.cause,
      reason: applied.reason,
      solution: applied.solution,
      fix: applied.fix,
      durationMs: applied.durationMs,
      recoveredAt: new Date().toISOString(),
      screenshots: {},
    };
    await this.#onRecovered(record, screenshots);
    return record;
  }
}
