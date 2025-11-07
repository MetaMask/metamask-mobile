/**
 * Overall approach:
 1. Analyzes code changes → Uses Claude AI to understand what files changed
 2. Uses an agentic approach → Claude can call tools (like reading files, getting diffs) to gather information
 3. Makes smart decisions → Selects only the relevant E2E test tags instead of running all tests
**/

import { AIE2ETagsSelector } from './ai-e2e-tags-selector/selector';

async function main() {
  const apiKey = process.env.E2E_CLAUDE_API_KEY;

  if (!apiKey) {
    console.error('❌ E2E_CLAUDE_API_KEY not set');
    process.exit(1);
  }

  const selector = new AIE2ETagsSelector(apiKey);
  console.log('Running AI analysis...');
  await selector.run();
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
