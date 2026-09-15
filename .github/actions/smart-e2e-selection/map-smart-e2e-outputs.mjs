/**
 * Maps analyzer smart-e2e JSON onto the existing Smart E2E GitHub Action outputs.
 *
 * E2E:
 *   ["ALL"] → '["ALL"]'
 *   []      → '[]'
 *   ids     → JSON.stringify(ids)
 *
 * Performance:
 *   ["ALL"] → ''   (empty string = run all; conservative fallback)
 *   []      → '[]' (skip)
 *   ids     → JSON.stringify(ids)
 */

export function mapSmartE2eOutputs(result) {
  const selectedTags = Array.isArray(result?.selected_tags)
    ? result.selected_tags
    : ['ALL'];
  const confidence =
    typeof result?.confidence === 'number' ? result.confidence : 0;
  const performance = result?.performance_tests ?? {};
  const performanceTags = Array.isArray(performance.selected_tags)
    ? performance.selected_tags
    : ['ALL'];
  const performanceReasoning =
    typeof performance.reasoning === 'string' ? performance.reasoning : '';

  return {
    ai_e2e_test_tags: JSON.stringify(selectedTags),
    ai_confidence: String(confidence),
    ai_performance_test_tags: mapPerformanceTags(performanceTags),
    ai_performance_test_reasoning: performanceReasoning,
  };
}

function mapPerformanceTags(tags) {
  if (tags.length === 1 && tags[0] === 'ALL') {
    return '';
  }
  return JSON.stringify(tags);
}

export function parseResultJson(raw) {
  if (raw == null || raw === '') {
    return null;
  }
  if (typeof raw === 'object') {
    return raw;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
