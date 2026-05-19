import { readFileSync } from 'fs';
import { parse } from 'yaml';
import { readFile } from 'fs/promises';
import {
  Flow,
  FlowStep,
  Action,
  StepEvaluation,
  RunReport,
  AiEvaluationResponse,
} from './types';
import { AdbBridge } from './adb-bridge';
import { AiClient } from './ai-client';
import { SCREENSHOT_DELAY_MS } from './config';

export class FlowPlayer {
  constructor(
    private adb: AdbBridge,
    private ai: AiClient,
    private currentScreenSize: [number, number],
  ) {}

  static loadFlow(filePath: string): Flow {
    const content = readFileSync(filePath, 'utf-8');
    return parse(content) as Flow;
  }

  static scaleCoords(
    coords: [number, number],
    fromScreen: [number, number],
    toScreen: [number, number],
  ): [number, number] {
    return [
      Math.round(coords[0] * (toScreen[0] / fromScreen[0])),
      Math.round(coords[1] * (toScreen[1] / fromScreen[1])),
    ];
  }

  async executeAction(
    action: Action,
    recordedScreen: [number, number],
  ): Promise<void> {
    switch (action.type) {
      case 'tap': {
        const [x, y] = FlowPlayer.scaleCoords(
          action.coords,
          recordedScreen,
          this.currentScreenSize,
        );
        await this.adb.tap(x, y);
        break;
      }
      case 'swipe': {
        const from = FlowPlayer.scaleCoords(
          action.from,
          recordedScreen,
          this.currentScreenSize,
        );
        const to = FlowPlayer.scaleCoords(
          action.to,
          recordedScreen,
          this.currentScreenSize,
        );
        await this.adb.swipe(from[0], from[1], to[0], to[1]);
        break;
      }
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

  async playStep(
    step: FlowStep,
    recordedScreen: [number, number],
    screenshotDir: string,
    baselineBase64: string | null,
  ): Promise<{ evaluation: AiEvaluationResponse; screenshotPath: string }> {
    await this.executeAction(step.action, recordedScreen);
    await new Promise((r) => setTimeout(r, SCREENSHOT_DELAY_MS));

    const screenshotPath = `${screenshotDir}/${String(step.id).padStart(3, '0')}.png`;
    await this.adb.takeScreenshot(screenshotPath);

    const screenshotBuffer = await readFile(screenshotPath);
    const currentBase64 = screenshotBuffer.toString('base64');

    const evaluation = await this.ai.evaluate(
      currentBase64,
      baselineBase64,
      step.ai_observation,
    );

    return { evaluation, screenshotPath };
  }

  async playFlow(
    flow: Flow,
    screenshotDir: string,
    baselineDir: string | null,
    onStep?: (
      stepId: number,
      total: number,
      evaluation: AiEvaluationResponse,
    ) => void,
  ): Promise<RunReport> {
    const evaluations: StepEvaluation[] = [];

    for (const step of flow.steps) {
      let baselineBase64: string | null = null;
      if (baselineDir) {
        try {
          const baselinePath = `${baselineDir}/${String(step.id).padStart(3, '0')}.png`;
          const buf = await readFile(baselinePath);
          baselineBase64 = buf.toString('base64');
        } catch {
          // No baseline for this step
        }
      }

      const { evaluation } = await this.playStep(
        step,
        flow.device.screen,
        screenshotDir,
        baselineBase64,
      );

      const stepEval: StepEvaluation = {
        stepId: step.id,
        ...evaluation,
      };
      evaluations.push(stepEval);

      onStep?.(step.id, flow.steps.length, evaluation);
    }

    return {
      flowName: flow.name,
      date: new Date().toISOString(),
      device: {
        serial: '',
        model: '',
        screen: this.currentScreenSize,
      },
      evaluations,
      summary: {
        total: evaluations.length,
        pass: evaluations.filter((e) => e.verdict === 'pass').length,
        warning: evaluations.filter((e) => e.verdict === 'warning').length,
        regression: evaluations.filter((e) => e.verdict === 'regression')
          .length,
      },
    };
  }
}
