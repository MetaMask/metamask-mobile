import { stringify } from 'yaml';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { Flow, FlowStep, Action, DeviceInfo } from './types';

export class FlowRecorder {
  private steps: FlowStep[] = [];
  private readonly startTime: string;

  constructor(
    private name: string,
    private goal: string,
    private device: DeviceInfo,
  ) {
    this.startTime = new Date().toISOString();
  }

  addStep(
    screenshotPath: string,
    observation: string,
    action: Action,
    note?: string,
  ): FlowStep {
    const step: FlowStep = {
      id: this.steps.length + 1,
      screenshot: screenshotPath,
      ai_observation: observation,
      action,
      timestamp: new Date().toISOString(),
    };
    if (note) {
      step.note = note;
    }
    this.steps.push(step);
    return step;
  }

  getFlow(): Flow {
    return {
      name: this.name,
      goal: this.goal,
      recorded: this.startTime,
      device: this.device,
      steps: [...this.steps],
    };
  }

  toYaml(): string {
    return stringify(this.getFlow());
  }

  save(filePath: string): void {
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, this.toYaml(), 'utf-8');
  }

  stepCount(): number {
    return this.steps.length;
  }
}
