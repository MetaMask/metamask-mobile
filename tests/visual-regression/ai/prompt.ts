import type { VisualTestScreenConfig } from './visual-test-config.ts';

const SYSTEM_BASELINE = `You are a visual regression tester for a mobile application.
You will receive two screenshots: a BASELINE (expected/good state) and a CURRENT (test run).

Your job:
1. Identify EVERY difference between the two images
2. Classify each difference as a REGRESSION or an ACCEPTABLE VARIATION.
3. DEFAULT RULE: Any difference is a REGRESSION unless a later rule explicitly marks it acceptable.
4. REGRESSIONS include: different text/numbers, missing/changed icons, moved/resized elements, color/styling changes, added/removed components.
5. ACCEPTABLE VARIATIONS: minor pixel-level rendering, anti-aliasing, values explicitly marked dynamic.

RESPONSE FORMAT (use exactly these headings):
- BASELINE COMPARISON: [one-line summary]
- REGRESSIONS FOUND: [bullet list, or "None"]
- ACCEPTABLE VARIATIONS: [bullet list, or "None"]
- OVERALL ASSESSMENT: [Pass or Fail with reasoning]`;

const SYSTEM_SINGLE = `You are a visual regression tester for a mobile application.
You will receive a single screenshot to analyze for visual correctness.

Your job:
1. Examine the screenshot for any visual issues, broken layout, or missing elements.
2. Classify each finding.

RESPONSE FORMAT (use exactly these headings):
- SUMMARY: [one-line overall assessment]
- ISSUES FOUND: [bullet list, or "None"]
- OVERALL ASSESSMENT: [Pass or Fail with reasoning]`;

const DOMAIN_METAMASK_MOBILE = `Product context: MetaMask mobile wallet app (iOS and Android).

ACCEPTABLE VARIATIONS (never classify as regressions):
- Status bar differences (time, battery, signal strength) — device-specific
- Navigation bar styling differences (iOS vs Android native chrome)
- Network fees / gas fees — dynamic values that change between runs
- Loading skeleton states vs loaded content (if content area is populated)
- Font rendering differences between iOS and Android
- Keyboard presence/absence (unless keyboard is required for the test)
- Minor shadow/elevation rendering differences between platforms
- Toast notifications appearing/disappearing

ALWAYS CLASSIFY AS REGRESSIONS:
- Missing UI elements (buttons, icons, text fields)
- Wrong text content (account names, token symbols, amounts — excluding gas fees)
- Broken layout (overlapping elements, clipped text, misaligned components)
- Wrong colors for branded elements (MetaMask fox, primary action buttons)
- Navigation state errors (wrong screen, missing back button)
- Tab bar missing or showing wrong active state`;

function buildScreenLayer(config: VisualTestScreenConfig): string {
  const elementsList = config.elements.map((el) => `- ${el}`).join('\n');
  const rulesList = config.promptRules.map((rule) => `- ${rule}`).join('\n');

  return `Screen under test: ${config.testName}.
Verify these elements are present and correctly rendered:
${elementsList}
Additional rules for this screen:
${rulesList}`;
}

export function generatePrompt(
  config: VisualTestScreenConfig,
  mode: 'baseline' | 'single',
): string {
  const systemLayer = mode === 'baseline' ? SYSTEM_BASELINE : SYSTEM_SINGLE;
  const screenLayer = buildScreenLayer(config);

  return [systemLayer, DOMAIN_METAMASK_MOBILE, screenLayer].join('\n\n');
}
