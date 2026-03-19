import { ClaudeProvider } from './claude.ts';

export interface VisualCheckResult {
  passed: boolean;
  regressions: string[];
  acceptableVariations: string[];
  summary: string;
  rawResponse: string;
}

export interface VisualAIProvider {
  analyzeImage(prompt: string, imagePath: string): Promise<VisualCheckResult>;
  compareImages(
    prompt: string,
    baselinePath: string,
    currentPath: string,
  ): Promise<VisualCheckResult>;
}

export interface ClaudeProviderConfig {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
}

/**
 * Create the default provider from environment variables.
 * Uses ANTHROPIC_API_KEY for Claude.
 * @throws Error if ANTHROPIC_API_KEY is not set.
 */
export function createDefaultProvider(
  config?: ClaudeProviderConfig,
): VisualAIProvider {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('No AI provider configured. Set ANTHROPIC_API_KEY.');
  }

  return new ClaudeProvider({
    apiKey,
    ...config,
  });
}

export function getProvider(
  name: 'claude',
  config?: ClaudeProviderConfig,
): VisualAIProvider {
  if (name !== 'claude') {
    throw new Error(`Unknown provider: ${String(name)}`);
  }

  return new ClaudeProvider(config);
}
