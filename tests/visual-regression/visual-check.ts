/* eslint-disable import-x/no-nodejs-modules */
import { mkdirSync, copyFileSync, existsSync, writeFileSync } from 'fs';
import { resolve, join } from 'path';
import {
  createDefaultProvider,
  type VisualCheckResult,
} from './ai/providers/index.ts';
import { generatePrompt } from './ai/prompt.ts';
import type { VisualTestScreenConfig } from './ai/visual-test-config.ts';
import { createSideBySide } from './utils/side-by-side.ts';

const VISUAL_REGRESSION_ROOT = resolve(__dirname);
const BASELINES_DIR = join(VISUAL_REGRESSION_ROOT, 'baselines');
const CURRENT_DIR = join(VISUAL_REGRESSION_ROOT, 'current');
const RESULTS_DIR = join(VISUAL_REGRESSION_ROOT, 'results');

export async function visualCheck(
  name: string,
  config: VisualTestScreenConfig,
): Promise<VisualCheckResult> {
  const platform = device.getPlatform();

  const screenshotPath = await device.takeScreenshot(name);

  const currentDir = join(CURRENT_DIR, platform);
  mkdirSync(currentDir, { recursive: true });
  const currentPath = join(currentDir, `${name}.png`);
  copyFileSync(screenshotPath, currentPath);

  const baselineDir = join(BASELINES_DIR, platform);
  const baselinePath = join(baselineDir, `${name}.png`);

  if (process.env.UPDATE_BASELINES === 'true') {
    mkdirSync(baselineDir, { recursive: true });
    copyFileSync(screenshotPath, baselinePath);
    console.log(
      `[visual-regression] Updated baseline for "${name}" (${platform})`,
    );
    return {
      passed: true,
      regressions: [],
      acceptableVariations: [],
      summary: 'Baseline updated',
      rawResponse: '',
    };
  }

  const hasBaseline = existsSync(baselinePath);
  const mode = hasBaseline ? 'baseline' : 'single';
  const prompt = generatePrompt(config, mode);
  const provider = createDefaultProvider();

  let result: VisualCheckResult;

  if (hasBaseline) {
    result = await provider.compareImages(prompt, baselinePath, currentPath);
    await createSideBySide(baselinePath, currentPath, name);
  } else {
    result = await provider.analyzeImage(prompt, currentPath);
  }

  mkdirSync(RESULTS_DIR, { recursive: true });
  const resultPath = join(RESULTS_DIR, `${name}.json`);
  writeFileSync(
    resultPath,
    JSON.stringify(
      {
        name,
        platform,
        mode,
        timestamp: new Date().toISOString(),
        ...result,
      },
      null,
      2,
    ),
  );

  const status = result.passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[visual-regression] ${status}: ${name} (${platform})`);

  if (!result.passed && result.regressions.length > 0) {
    console.log('  Regressions:');
    result.regressions.forEach((r) => console.log(`    - ${r}`));
  }

  return result;
}
