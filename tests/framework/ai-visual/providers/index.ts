export { ClaudeProvider } from './claude';
export type {
  AIProvider,
  AIProviderConfig,
  AIAnalysisResult,
  AIComparisonResult,
} from './types';

import { ClaudeProvider } from './claude';
import type { AIProvider, AIProviderConfig } from './types';

export function createDefaultProvider(
  config: AIProviderConfig = {},
): AIProvider {
  if (process.env.ANTHROPIC_API_KEY) {
    return new ClaudeProvider(config);
  }

  throw new Error(
    'No AI provider configured. Set ANTHROPIC_API_KEY in .e2e.env.',
  );
}
