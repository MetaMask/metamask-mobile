import { VisualTestConfig } from './types';

export const METAMASK_PACKAGE_ID = 'io.metamask';
export const METAMASK_FLASK_PACKAGE_ID = 'io.metamask.flask';

export const DEFAULT_CONFIG: VisualTestConfig = {
  endpoint: 'https://litellm.consensys.info',
  model: 'gemma4',
  device: null,
  liveView: false,
  outputDir: './visual-test-results',
  verbose: false,
  apk: null,
  apiKey: null,
};

export const LIVE_VIEW_PORT = 3210;
export const SCREENSHOT_DELAY_MS = 500;
export const MAX_NAVIGATION_STEPS = 100;

export function resolveConfig(
  overrides: Partial<VisualTestConfig>,
): VisualTestConfig {
  return {
    ...DEFAULT_CONFIG,
    apiKey: process.env.LITELLM_API_KEY ?? DEFAULT_CONFIG.apiKey,
    ...overrides,
  };
}
