/**
 * Three-layer prompt architecture for AI visual regression testing.
 *
 * Layer 1 — System: generic visual regression analysis rules + response format
 * Layer 2 — Domain: product-specific context (MetaMask Mobile)
 * Layer 3 — Test: per-test elements and custom rules
 *
 * This layered design is necessary context for anyone modifying prompts — keeping
 * it here rather than in external docs prevents prompt drift.
 */

const SYSTEM_BASELINE = `You are a visual regression tester.
You will receive two screenshots: a BASELINE (expected/good state) and a CURRENT (test run).

Your job:
1. Identify EVERY difference between the two images — text, icons, images, layout, styling, spacing, colors.
2. Classify each difference as a REGRESSION, a WARNING, or an ACCEPTABLE VARIATION.
3. DEFAULT RULE: Any difference is a REGRESSION unless a later rule explicitly marks it as a WARNING or acceptable.
4. REGRESSIONS include: different text or numbers, missing or changed icons/logos/images, moved or resized elements, color or styling changes, added or removed UI components.
5. WARNINGS are differences that should be reported but do not constitute a failure — only use this when a rule below explicitly classifies something as a WARNING.
6. ACCEPTABLE VARIATIONS are ONLY: minor pixel-level rendering, anti-aliasing artifacts, and values explicitly marked as dynamic in the rules below.

RESPONSE FORMAT (use exactly these headings):
- BASELINE COMPARISON: [one-line summary of differences]
- REGRESSIONS FOUND: [bullet list, or "None"]
- WARNINGS: [bullet list, or "None"]
- ACCEPTABLE VARIATIONS: [bullet list, or "None"]
- OVERALL ASSESSMENT: [Pass, Pass with warnings, or Fail with reasoning]`;

const SYSTEM_SINGLE = `You are a visual regression tester.
You will receive a single screenshot to analyze for UI correctness.

Your job:
1. Verify layout, alignment, and styling of all visible elements.
2. Flag any visual bugs, missing components, or inconsistencies.

RESPONSE FORMAT (use exactly these headings):
- SUMMARY: [one-line overall assessment]
- ISSUES FOUND: [bullet list, or "None"]
- OVERALL ASSESSMENT: [Pass or Fail with reasoning]`;

const DOMAIN_METAMASK_MOBILE = `Product context: MetaMask Mobile (React Native app, iOS and Android).
- Status bar content (time, battery, signal strength) must be IGNORED COMPLETELY — do not mention or compare these values at all.
- Navigation bar style differences between iOS and Android are acceptable variations.
- Theme differences (dark vs light mode) are acceptable variations, not regressions.
- Network fees / gas fees are dynamic values — always treat differences in fees as ACCEPTABLE VARIATIONS, never as regressions.
- Minor font rendering differences between platforms are acceptable variations.
- Minor differences in screen density, element size proportions, or aspect ratio between device types are acceptable variations.`;

function buildTestLayer(
  testName: string,
  elements: string[],
  promptRules: string[],
): string {
  const parts = [`Screen under test: ${testName}.`];

  if (elements.length > 0) {
    parts.push('Verify these elements are present and correctly rendered:');
    parts.push(elements.map((el) => `- ${el}`).join('\n'));
  }

  if (promptRules.length > 0) {
    parts.push('Additional rules for this screen:');
    parts.push(promptRules.map((r) => `- ${r}`).join('\n'));
  }

  return parts.join('\n');
}

export type PromptMode = 'baseline' | 'single';

export function generateAIPrompt(
  testName: string,
  elements: string[],
  mode: PromptMode,
  options: { domain?: string; promptRules?: string[] } = {},
): string {
  const { domain = DOMAIN_METAMASK_MOBILE, promptRules = [] } = options;

  const systemLayer = mode === 'baseline' ? SYSTEM_BASELINE : SYSTEM_SINGLE;
  const testLayer = buildTestLayer(testName, elements, promptRules);

  return [systemLayer, domain, testLayer].join('\n\n');
}
