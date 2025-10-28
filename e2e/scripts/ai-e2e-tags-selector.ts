import { AIE2ETagsSelector } from './ai-e2e-tags-selector/selector';

export { AIE2ETagsSelector };
export { default } from './ai-e2e-tags-selector/selector';
export * from './ai-e2e-tags-selector/types';

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
