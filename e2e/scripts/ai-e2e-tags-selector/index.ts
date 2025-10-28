/**
 * AI E2E Tag Selector - CLI Entry Point
 *
 * Uses Claude with extended thinking and tool use to analyze code changes
 * and select appropriate E2E smoke test tags.
 *
 * Requires E2E_CLAUDE_API_KEY environment variable and GitHub CLI (gh) installed.
 * Designed for CI integration.
 */

import { AIE2ETagsSelector } from './selector';

// Export for programmatic use
export { AIE2ETagsSelector };
export * from './types';

// CLI execution
if (require.main === module) {
  const apiKey = process.env.E2E_CLAUDE_API_KEY;

  if (!apiKey) {
    console.error('❌ E2E_CLAUDE_API_KEY not set');
    process.exit(1);
  }

  const selector = new AIE2ETagsSelector(apiKey);
  selector.run().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}
