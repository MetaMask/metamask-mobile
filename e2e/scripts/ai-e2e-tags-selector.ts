/**
 * Overall approach:
 1. Analyzes code changes → Uses Claude AI to understand what files changed
 2. Uses an agentic approach → Claude can call tools (like reading files, getting diffs) to gather information
 3. Makes smart decisions and assists the user depending on the mode
**/

import { E2EAIAnalyzer } from './ai-e2e-tags-selector/analyzer';

async function main() {
  const apiKey = process.env.E2E_CLAUDE_API_KEY;

  if (!apiKey) {
    console.error('❌ E2E_CLAUDE_API_KEY not set');
    process.exit(1);
  }

  const analyzer = new E2EAIAnalyzer(apiKey);
  // run() reads CLI args and runs the appropriate mode
  await analyzer.run();
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
