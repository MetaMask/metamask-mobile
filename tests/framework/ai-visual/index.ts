// eslint-disable-next-line import-x/no-nodejs-modules
import fs from 'fs';
// eslint-disable-next-line import-x/no-nodejs-modules
import path from 'path';
import type { TestInfo } from '@playwright/test';
import type { Browser } from 'webdriverio';
import { createDefaultProvider, type AIProvider } from './providers';
import type { AIComparisonResult, AIAnalysisResult } from './providers/types';
import { generateAIPrompt, type PromptMode } from './prompt';
import type { VisualTestConfig } from './configs';
import {
  saveBase64Screenshot,
  createSideBySideComparison,
} from './image-utils';

const BASELINES_DIR = path.resolve(
  __dirname,
  '../../../tests/visual-regression/baselines',
);
const CURRENT_DIR = path.resolve(
  __dirname,
  '../../../test-results/visual-regression/current',
);
const DIFFS_DIR = path.resolve(
  __dirname,
  '../../../test-results/visual-regression/diffs',
);
const RESULTS_DIR = path.resolve(
  __dirname,
  '../../../test-results/visual-regression/results',
);
const SUMMARY_FILE = path.join(RESULTS_DIR, 'visual-regression-summary.json');

export { createTestConfig } from './configs';
export type { VisualTestConfig } from './configs';
export { createDefaultProvider } from './providers';

let cachedProvider: AIProvider | null = null;

function getProvider(): AIProvider {
  if (!cachedProvider) {
    cachedProvider = createDefaultProvider();
  }
  return cachedProvider;
}

function isEnabled(): boolean {
  return process.env.AI_VISUAL_TESTING_ENABLED === 'true';
}

function isCaptureMode(): boolean {
  return process.env.CAPTURE_BASELINES === 'true';
}

export interface VisualTestOptions extends VisualTestConfig {
  skipAI?: boolean;
}

export interface VisualTestResult {
  success: boolean;
  passed: boolean;
  screenshotPath: string;
  baselinePath: string;
  diffPath: string | null;
  testName: string;
  mode: PromptMode;
  aiResult: AIComparisonResult | AIAnalysisResult | null;
}

function platformDir(platform: string): string {
  return platform === 'ios' ? 'ios' : 'android';
}

async function takeAppiumScreenshot(
  appiumDriver: Browser,
  outputPath: string,
): Promise<string> {
  const base64 = await appiumDriver.takeScreenshot();
  saveBase64Screenshot(base64, outputPath);
  return outputPath;
}

function appendToSummary(entry: {
  testName: string;
  screenshotName: string;
  platform: string;
  passed: boolean;
  regressions: string[];
  timestamp: string;
}): void {
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }

  let summary: (typeof entry)[] = [];
  if (fs.existsSync(SUMMARY_FILE)) {
    try {
      summary = JSON.parse(fs.readFileSync(SUMMARY_FILE, 'utf-8'));
    } catch {
      summary = [];
    }
  }

  summary.push(entry);
  fs.writeFileSync(SUMMARY_FILE, JSON.stringify(summary, null, 2));
}

async function attachToPlaywrightReport(
  testInfo: TestInfo,
  screenshotPath: string,
  baselinePath: string,
  diffPath: string | null,
  aiResult: AIComparisonResult | AIAnalysisResult | null,
): Promise<void> {
  if (fs.existsSync(screenshotPath)) {
    await testInfo.attach('visual-current', {
      path: screenshotPath,
      contentType: 'image/png',
    });
  }

  if (fs.existsSync(baselinePath)) {
    await testInfo.attach('visual-baseline', {
      path: baselinePath,
      contentType: 'image/png',
    });
  }

  if (diffPath && fs.existsSync(diffPath)) {
    await testInfo.attach('visual-diff', {
      path: diffPath,
      contentType: 'image/png',
    });
  }

  if (aiResult?.rawResponse) {
    await testInfo.attach('visual-ai-analysis', {
      body: aiResult.rawResponse,
      contentType: 'text/plain',
    });
  }
}

export async function aiVisualTest(
  appiumDriver: Browser,
  screenshotName: string,
  platform: string,
  config: VisualTestOptions,
  testInfo?: TestInfo,
): Promise<VisualTestResult> {
  const {
    testName,
    elements,
    promptRules,
    mode,
    stabilityWait,
    skipAI = false,
  } = config;

  const platDir = platformDir(platform);
  const currentPath = path.join(CURRENT_DIR, platDir, screenshotName);
  const baselinePath = path.join(BASELINES_DIR, platDir, screenshotName);
  const diffName = screenshotName.replace('.png', '_diff.png');
  const diffPath = path.join(DIFFS_DIR, platDir, diffName);

  const emptyResult: VisualTestResult = {
    success: true,
    passed: true,
    screenshotPath: currentPath,
    baselinePath,
    diffPath: null,
    testName,
    mode,
    aiResult: null,
  };

  if (!isEnabled()) {
    console.log(
      '⏭️  AI visual testing disabled (AI_VISUAL_TESTING_ENABLED=false)',
    );
    return emptyResult;
  }

  if (stabilityWait > 0) {
    await new Promise((resolve) => setTimeout(resolve, stabilityWait));
  }

  await takeAppiumScreenshot(appiumDriver, currentPath);
  console.log(`📸 Screenshot captured: ${currentPath}`);

  if (isCaptureMode()) {
    const captureDir = path.dirname(baselinePath);
    if (!fs.existsSync(captureDir)) {
      fs.mkdirSync(captureDir, { recursive: true });
    }
    fs.copyFileSync(currentPath, baselinePath);
    console.log(`📸 Baseline captured: ${baselinePath}`);
    return emptyResult;
  }

  if (skipAI) {
    console.log('⏭️  AI analysis skipped');
    return emptyResult;
  }

  const provider = getProvider();
  const prompt = generateAIPrompt(testName, elements, mode, { promptRules });

  console.log(`🤖 Running AI analysis with ${provider.name}...`);

  let aiResult: AIComparisonResult | AIAnalysisResult;
  let comparisonPath: string | null = null;

  if (mode === 'baseline' && fs.existsSync(baselinePath)) {
    console.log(`🔍 Comparing against baseline: ${baselinePath}`);
    aiResult = await provider.compareImages(prompt, baselinePath, currentPath);
    comparisonPath = await createSideBySideComparison(
      baselinePath,
      currentPath,
      diffPath,
    );
  } else {
    if (mode === 'baseline') {
      console.log(
        `⚠️  No baseline found at ${baselinePath}, running single-image analysis`,
      );
    }
    aiResult = await provider.analyzeImage(prompt, currentPath);
  }

  const regressions = 'regressions' in aiResult ? aiResult.regressions : [];
  const warnings = 'warnings' in aiResult ? aiResult.warnings : [];

  if (aiResult.success && aiResult.passed) {
    if (warnings.length > 0) {
      console.log(`✅ Visual test PASSED (with warnings): ${aiResult.summary}`);
      warnings.forEach((w: string) => console.log(`   ⚠️  ${w}`));
    } else {
      console.log(`✅ Visual test PASSED: ${aiResult.summary}`);
    }
  } else if (aiResult.success && !aiResult.passed) {
    console.log(`❌ Visual test FAILED: ${aiResult.summary}`);
    const issues = 'issues' in aiResult ? aiResult.issues : [];
    const items = regressions.length > 0 ? regressions : issues;
    if (items.length > 0) {
      items.forEach((item: string) => console.log(`   - ${item}`));
    }
    if (warnings.length > 0) {
      warnings.forEach((w: string) => console.log(`   ⚠️  ${w}`));
    }
    if (comparisonPath) {
      console.log(`📸 Side-by-side comparison: ${comparisonPath}`);
    }
  } else {
    console.log(`⚠️  AI analysis incomplete: ${aiResult.summary}`);
  }

  appendToSummary({
    testName,
    screenshotName,
    platform: platDir,
    passed: aiResult.passed,
    regressions,
    timestamp: new Date().toISOString(),
  });

  if (testInfo) {
    await attachToPlaywrightReport(
      testInfo,
      currentPath,
      baselinePath,
      comparisonPath,
      aiResult,
    );
  }

  return {
    success: aiResult.success,
    passed: aiResult.passed,
    screenshotPath: currentPath,
    baselinePath,
    diffPath: comparisonPath,
    testName,
    mode,
    aiResult,
  };
}
