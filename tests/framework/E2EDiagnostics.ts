/* eslint-disable import-x/no-nodejs-modules */
import { copyFile, mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { LoginViewSelectors } from '../../app/components/Views/Login/LoginView.testIds';
import { OnboardingSelectorIDs } from '../../app/components/Views/Onboarding/Onboarding.testIds';
import { WalletViewSelectorsIDs } from '../../app/components/Views/Wallet/WalletView.testIds';
import { ErrorBoundarySelectorsIDs } from '../selectors/ErrorBoundary/ErrorBoundaryView.selectors';
import { createLogger } from './logger';

const logger = createLogger({ name: 'E2EDiagnostics' });

const ARTIFACT_ROOT =
  process.env.E2E_DIAGNOSTICS_ROOT ||
  join(process.cwd(), 'tests', 'artifacts', 'e2e-diagnostics');

const REDACTED_VALUE = '[redacted]';

const SENSITIVE_KEY_PATTERN =
  /password|secret|seed|token|key|mnemonic|vault|auth|credential/iu;

type JsonRecord = Record<string, unknown>;

export interface E2EDiagnosticsContext {
  reason: string;
  error?: unknown;
  metadata?: JsonRecord;
}

interface JestStateLike {
  currentTestName?: string;
  testPath?: string;
}

interface ArtifactWriteResult {
  path?: string;
  error?: JsonRecord;
}

const UI_SENTINELS = [
  { name: 'login.container', value: LoginViewSelectors.CONTAINER },
  { name: 'login.passwordInput', value: LoginViewSelectors.PASSWORD_INPUT },
  { name: 'login.button', value: LoginViewSelectors.LOGIN_BUTTON_ID },
  { name: 'wallet.container', value: WalletViewSelectorsIDs.WALLET_CONTAINER },
  { name: 'wallet.accountPicker', value: WalletViewSelectorsIDs.ACCOUNT_ICON },
  { name: 'wallet.buyButton', value: WalletViewSelectorsIDs.WALLET_BUY_BUTTON },
  { name: 'onboarding.container', value: OnboardingSelectorIDs.CONTAINER_ID },
  {
    name: 'onboarding.createWallet',
    value: OnboardingSelectorIDs.NEW_WALLET_BUTTON,
  },
  {
    name: 'onboarding.existingWallet',
    value: OnboardingSelectorIDs.EXISTING_WALLET_BUTTON,
  },
  {
    name: 'errorBoundary.container',
    value: ErrorBoundarySelectorsIDs.CONTAINER,
  },
] as const;

let captureCount = 0;

const safeFileFragment = (value: string): string =>
  value
    .replace(/[^a-z0-9._-]+/giu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, 120) || 'unknown';

const getJestState = (): JestStateLike => {
  try {
    if (typeof expect === 'undefined' || !expect.getState) {
      return {};
    }
    return expect.getState() as JestStateLike;
  } catch {
    return {};
  }
};

const getDevicePlatform = (): string => {
  try {
    return device.getPlatform();
  } catch {
    return 'unknown';
  }
};

const serializeError = (error: unknown): JsonRecord | undefined => {
  if (!error) {
    return undefined;
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    message: String(error),
  };
};

const sanitizeMetadata = (metadata: unknown): unknown => {
  if (Array.isArray(metadata)) {
    return metadata.map((item) => sanitizeMetadata(item));
  }

  if (!metadata || typeof metadata !== 'object') {
    return metadata;
  }

  return Object.entries(metadata as JsonRecord).reduce<JsonRecord>(
    (sanitized, [key, value]) => {
      sanitized[key] = SENSITIVE_KEY_PATTERN.test(key)
        ? REDACTED_VALUE
        : sanitizeMetadata(value);
      return sanitized;
    },
    {},
  );
};

const writeJson = async (filePath: string, value: unknown): Promise<void> => {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
};

const captureScreenshot = async (
  artifactId: string,
  outputDir: string,
): Promise<ArtifactWriteResult> => {
  try {
    const tempPath = await device.takeScreenshot(`${artifactId}-screenshot`);
    const outputPath = join(outputDir, 'screenshot.png');
    await copyFile(tempPath, outputPath);
    return { path: outputPath };
  } catch (error) {
    return { error: serializeError(error) };
  }
};

const captureViewHierarchyXml = async (
  outputDir: string,
): Promise<{ xml?: string; result: ArtifactWriteResult }> => {
  try {
    const xml = await device.generateViewHierarchyXml();
    const outputPath = join(outputDir, 'view-hierarchy.xml');
    await writeFile(outputPath, xml);
    return { xml, result: { path: outputPath } };
  } catch (error) {
    return { result: { error: serializeError(error) } };
  }
};

const captureIosViewHierarchy = async (
  artifactId: string,
  outputDir: string,
): Promise<ArtifactWriteResult | undefined> => {
  if (getDevicePlatform() !== 'ios') {
    return undefined;
  }

  try {
    const tempPath = await device.captureViewHierarchy(
      `${artifactId}-view-hierarchy`,
    );
    const outputPath = join(outputDir, 'view-hierarchy.viewhierarchy');
    await copyFile(tempPath, outputPath);
    return { path: outputPath };
  } catch (error) {
    return { error: serializeError(error) };
  }
};

const summarizeUiState = (viewHierarchyXml?: string): JsonRecord => {
  if (!viewHierarchyXml) {
    return {
      classification: 'unknown',
      foundSentinels: [],
      missingSentinels: UI_SENTINELS.map((sentinel) => sentinel.name),
    };
  }

  const foundSentinels: string[] = UI_SENTINELS.filter((sentinel) =>
    viewHierarchyXml.includes(sentinel.value),
  ).map((sentinel) => sentinel.name);

  const has = (name: string) => foundSentinels.includes(name);
  const classification = has('errorBoundary.container')
    ? 'error-boundary'
    : has('login.container')
      ? 'login'
      : has('wallet.container')
        ? 'wallet'
        : has('onboarding.container')
          ? 'onboarding'
          : 'unknown';

  return {
    classification,
    foundSentinels,
    missingSentinels: UI_SENTINELS.filter(
      (sentinel) => !foundSentinels.includes(sentinel.name),
    ).map((sentinel) => sentinel.name),
  };
};

export const captureE2EDiagnostics = async ({
  reason,
  error,
  metadata = {},
}: E2EDiagnosticsContext): Promise<void> => {
  if (process.env.E2E_DIAGNOSTICS === 'false') {
    return;
  }

  try {
    captureCount += 1;
    const timestamp = new Date().toISOString().replace(/[:.]/gu, '-');
    const jestState = getJestState();
    const testName = jestState.currentTestName || 'unknown-test';
    const artifactId = safeFileFragment(
      `${timestamp}-${process.pid}-${captureCount}-${reason}-${testName}`,
    );
    const outputDir = join(ARTIFACT_ROOT, artifactId);

    await mkdir(outputDir, { recursive: true });

    const screenshot = await captureScreenshot(artifactId, outputDir);
    const viewHierarchy = await captureViewHierarchyXml(outputDir);
    const iosViewHierarchy = await captureIosViewHierarchy(
      artifactId,
      outputDir,
    );
    const uiState = summarizeUiState(viewHierarchy.xml);

    await writeJson(join(outputDir, 'metadata.json'), {
      capturedAt: new Date().toISOString(),
      reason,
      platform: getDevicePlatform(),
      testName,
      testPath: jestState.testPath,
      process: {
        pid: process.pid,
        cwd: process.cwd(),
      },
      ci: {
        isCI: process.env.CI === 'true',
        githubJob: process.env.GITHUB_JOB,
        githubRunId: process.env.GITHUB_RUN_ID,
        githubRunAttempt: process.env.GITHUB_RUN_ATTEMPT,
        jobName: process.env.JOB_NAME,
        runId: process.env.RUN_ID,
        runAttempt: process.env.RUN_ATTEMPT,
      },
      error: serializeError(error),
      metadata: sanitizeMetadata(metadata),
      artifacts: {
        screenshot,
        viewHierarchyXml: viewHierarchy.result,
        iosViewHierarchy,
      },
      uiState,
    });

    await writeJson(join(outputDir, 'ui-state.json'), uiState);

    logger.info(`Captured E2E diagnostics in ${outputDir}`);
  } catch (captureError) {
    logger.warn('Failed to capture E2E diagnostics', captureError);
  }
};
