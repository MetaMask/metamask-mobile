/**
 * Type definitions for AI visual regression testing providers.
 */

/** Result of analyzing a single screenshot. */
export interface AIAnalysisResult {
  /** Whether the analysis completed without errors. */
  success: boolean;
  /** Whether the visual test passed (no issues found). */
  passed: boolean;
  /** Brief summary of findings. */
  summary: string;
  /** List of issues detected. */
  issues: string[];
  /** Full AI response text. */
  rawResponse: string;
}

/** Result of comparing a baseline screenshot against a current screenshot. */
export interface AIComparisonResult {
  /** Whether the comparison completed without errors. */
  success: boolean;
  /** Whether the images match (no regressions detected). */
  passed: boolean;
  /** Brief summary of the comparison. */
  summary: string;
  /** Regressions detected between baseline and current. */
  regressions: string[];
  /** Non-blocking issues that should be surfaced but don't fail the test. */
  warnings: string[];
  /** Differences classified as acceptable (dynamic values, rendering artifacts, etc.). */
  acceptableVariations: string[];
  /** Full AI response text. */
  rawResponse: string;
}

/** Interface that all AI providers must implement. */
export interface AIProvider {
  /** Human-readable provider name. */
  readonly name: string;

  /**
   * Analyze a single screenshot for visual correctness.
   * @param prompt - Analysis instructions for the AI.
   * @param image - File path or raw Buffer of the screenshot.
   */
  analyzeImage(
    prompt: string,
    image: string | Buffer,
  ): Promise<AIAnalysisResult>;

  /**
   * Compare a baseline screenshot against a current screenshot.
   * @param prompt - Comparison instructions for the AI.
   * @param baselineImage - File path or raw Buffer of the baseline.
   * @param currentImage - File path or raw Buffer of the current screenshot.
   */
  compareImages(
    prompt: string,
    baselineImage: string | Buffer,
    currentImage: string | Buffer,
  ): Promise<AIComparisonResult>;
}

/** Configuration options passed to a provider constructor. */
export interface AIProviderConfig {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
}
