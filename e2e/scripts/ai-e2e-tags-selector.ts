/**
 * AI E2E Tag Selector - Backward Compatibility Wrapper
 *
 * This file maintains backward compatibility by re-exporting
 * the refactored modular implementation.
 *
 * The implementation has been refactored into a modular structure:
 * - e2e/scripts/ai-e2e-tags-selector/
 *
 * Original monolithic file preserved as:
 * - e2e/scripts/ai-e2e-tags-selector.legacy.ts
 */

import { AIE2ETagsSelector } from './ai-e2e-tags-selector/selector';

// Re-export everything from the modular implementation
export { AIE2ETagsSelector };
export { default } from './ai-e2e-tags-selector/selector';
export * from './ai-e2e-tags-selector/types';

// CLI execution is handled by the index.ts in the modular structure
// If this file is run directly, forward to the new entry point
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
