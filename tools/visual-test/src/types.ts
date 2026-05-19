// --- Action types ---

export type ActionType =
  | 'tap'
  | 'swipe'
  | 'type'
  | 'back'
  | 'home'
  | 'wait'
  | 'launch_app';

export interface TapAction {
  type: 'tap';
  target: string;
  coords: [number, number];
}

export interface SwipeAction {
  type: 'swipe';
  target: string;
  from: [number, number];
  to: [number, number];
}

export interface TypeAction {
  type: 'type';
  target: string;
  text: string;
}

export interface BackAction {
  type: 'back';
}

export interface HomeAction {
  type: 'home';
}

export interface WaitAction {
  type: 'wait';
  ms: number;
}

export interface LaunchAppAction {
  type: 'launch_app';
  packageId: string;
}

export type Action =
  | TapAction
  | SwipeAction
  | TypeAction
  | BackAction
  | HomeAction
  | WaitAction
  | LaunchAppAction;

// --- Flow types ---

export interface FlowStep {
  id: number;
  screenshot: string;
  ai_observation: string;
  action: Action;
  note?: string;
  timestamp: string;
}

export interface DeviceInfo {
  serial: string;
  model: string;
  screen: [number, number];
}

export interface Flow {
  name: string;
  goal: string;
  recorded: string;
  device: DeviceInfo;
  steps: FlowStep[];
}

// --- Evaluation types ---

export type Verdict = 'pass' | 'warning' | 'regression';
export type Severity = 'low' | 'medium' | 'high';

export interface StepEvaluation {
  stepId: number;
  verdict: Verdict;
  summary: string;
  details: string;
  severity: Severity;
}

export interface RunReport {
  flowName: string;
  date: string;
  device: DeviceInfo;
  evaluations: StepEvaluation[];
  summary: {
    total: number;
    pass: number;
    warning: number;
    regression: number;
  };
}

// --- AI response types ---

export interface AiNavigationResponse {
  observation: string;
  action: Action;
  done: boolean;
  issue?: string;
}

export interface AiEvaluationResponse {
  verdict: Verdict;
  summary: string;
  details: string;
  severity: Severity;
}

// --- Config ---

export interface VisualTestConfig {
  endpoint: string;
  model: string;
  device: string | null;
  liveView: boolean;
  outputDir: string;
  verbose: boolean;
  apk: string | null;
  apiKey: string | null;
}

// --- Live view SSE event ---

export interface LiveViewEvent {
  type: 'step' | 'status' | 'evaluation';
  stepNumber: number;
  screenshotPath: string;
  observation: string;
  action: string;
  verdict?: Verdict;
  history: Array<{ step: number; summary: string; verdict?: Verdict }>;
}
