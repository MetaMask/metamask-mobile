import { readFile } from 'fs/promises';
import { join } from 'path';
import { AdbBridge } from './adb-bridge';
import { AiClient } from './ai-client';
import { FlowRecorder } from './flow-recorder';
import { Action, AiNavigationResponse, DeviceInfo } from './types';
import { SCREENSHOT_DELAY_MS, MAX_NAVIGATION_STEPS } from './config';

export interface NavigatorCallbacks {
  onStep: (
    stepNum: number,
    response: AiNavigationResponse,
    screenshotPath: string,
  ) => void;
  onDone: (totalSteps: number) => void;
  onError: (error: Error) => void;
}

export class AiNavigator {
  private paused = false;
  private stopped = false;
  private pendingNote: string | null = null;
  private recorder: FlowRecorder;
  private history: Array<{ observation: string; action: string }> = [];

  constructor(
    private adb: AdbBridge,
    private ai: AiClient,
    private device: DeviceInfo,
    private goal: string,
    private screenshotDir: string,
  ) {
    const flowName = goal
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .toLowerCase()
      .slice(0, 50);
    this.recorder = new FlowRecorder(flowName, goal, device);
  }

  pause(): void {
    this.paused = true;
  }
  resume(): void {
    this.paused = false;
  }
  stop(): void {
    this.stopped = true;
  }
  addNote(text: string): void {
    this.pendingNote = text;
  }
  isPaused(): boolean {
    return this.paused;
  }
  getRecorder(): FlowRecorder {
    return this.recorder;
  }

  async executeAction(action: Action): Promise<void> {
    switch (action.type) {
      case 'tap':
        await this.adb.tap(action.coords[0], action.coords[1]);
        break;
      case 'swipe':
        await this.adb.swipe(
          action.from[0],
          action.from[1],
          action.to[0],
          action.to[1],
        );
        break;
      case 'type':
        await this.adb.typeText(action.text);
        break;
      case 'back':
        await this.adb.pressBack();
        break;
      case 'home':
        await this.adb.pressHome();
        break;
      case 'wait':
        await new Promise((r) => setTimeout(r, action.ms));
        break;
      case 'launch_app':
        await this.adb.launchApp(action.packageId);
        break;
    }
  }

  async run(callbacks: NavigatorCallbacks): Promise<void> {
    for (let step = 1; step <= MAX_NAVIGATION_STEPS; step++) {
      if (this.stopped) break;

      while (this.paused && !this.stopped) {
        await new Promise((r) => setTimeout(r, 200));
      }
      if (this.stopped) break;

      try {
        const screenshotPath = join(
          this.screenshotDir,
          `${String(step).padStart(3, '0')}.png`,
        );
        await this.adb.takeScreenshot(screenshotPath);

        const buffer = await readFile(screenshotPath);
        const base64 = buffer.toString('base64');

        const response = await this.ai.navigate(
          base64,
          this.goal,
          this.history,
        );

        const note = this.pendingNote;
        this.pendingNote = null;
        this.recorder.addStep(
          screenshotPath,
          response.observation,
          response.action,
          note ?? undefined,
        );

        this.history.push({
          observation: response.observation,
          action: this.formatAction(response.action),
        });

        callbacks.onStep(step, response, screenshotPath);

        if (response.done) {
          callbacks.onDone(step);
          return;
        }

        await this.executeAction(response.action);
        await new Promise((r) => setTimeout(r, SCREENSHOT_DELAY_MS));
      } catch (error) {
        callbacks.onError(
          error instanceof Error ? error : new Error(String(error)),
        );
        return;
      }
    }

    callbacks.onDone(this.recorder.stepCount());
  }

  private formatAction(action: Action): string {
    switch (action.type) {
      case 'tap':
        return `TAP "${action.target}" @ (${action.coords.join(', ')})`;
      case 'swipe':
        return `SWIPE from (${action.from.join(', ')}) to (${action.to.join(', ')})`;
      case 'type':
        return `TYPE "${action.text}"`;
      case 'back':
        return 'BACK';
      case 'home':
        return 'HOME';
      case 'wait':
        return `WAIT ${action.ms}ms`;
      case 'launch_app':
        return `LAUNCH ${action.packageId}`;
    }
  }
}
