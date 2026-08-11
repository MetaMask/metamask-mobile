export interface ScenarioMetadata {
  id: string;
  number: string;
  name: string;
  slug: string;
  description: string;
  platform: 'ios-simulator';
  preconditions: string[];
}

export interface ScenarioPhase {
  name: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
}

export type ScenarioPreconditionValue = boolean | number | string | null;

export type ScenarioPreconditionState = Record<
  string,
  ScenarioPreconditionValue
>;

export interface ScenarioContext {
  log(message: string): void;
  clickTestId(testId: string): void;
  waitForTestId(testId: string, timeoutMs: number): void;
  getVisibleText(testId: string, allowFailure?: boolean): string | null;
  getExactScreenText(testId: string): string | null;
  delay(durationMs: number): Promise<void>;
  now(): number;
  measurePhase(
    name: string,
    action: () => Promise<void> | void,
  ): Promise<ScenarioPhase>;
}

export interface ScenarioRunResult {
  phases: ScenarioPhase[];
  preconditions: ScenarioPreconditionState;
}

export interface SwapsPerformanceScenario {
  metadata: ScenarioMetadata;
  run(context: ScenarioContext): Promise<ScenarioRunResult>;
}
