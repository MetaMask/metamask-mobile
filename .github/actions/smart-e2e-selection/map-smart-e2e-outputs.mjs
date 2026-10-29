/**
 * Maps analyzer smart-e2e JSON onto the existing Smart E2E GitHub Action outputs.
 *
 * E2E:
 *   ["ALL"] → '["ALL"]'
 *   []      → '[]'
 *   ids     → JSON.stringify(ids)
 *
 * Performance tags are not part of Smart E2E selection. The output is
 * always an empty list, including when an older analyzer result still
 * carries performance_tests.
 */

export function mapSmartE2eOutputs(result) {
  const selectedTags = Array.isArray(result?.selected_tags)
    ? result.selected_tags
    : ['ALL'];
  const confidence =
    typeof result?.confidence === 'number' ? result.confidence : 0;

  return {
    ai_e2e_test_tags: JSON.stringify(selectedTags),
    ai_confidence: String(confidence),
    ai_performance_test_tags: '[]',
    ai_performance_test_reasoning:
      'Performance tests are not part of Smart E2E selection.',
  };
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
