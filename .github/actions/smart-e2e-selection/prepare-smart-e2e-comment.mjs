/**
 * Comment-only view of a smart-e2e analyzer result.
 *
 * The shared comment renderer omits empty arrays, so a chosen-nothing
 * selection disappears from the PR comment. Replace that empty E2E tag
 * list with a sentence. Drop performance_tests so the Smart E2E comment
 * does not list performance tags. CI still reads the original analyzer JSON.
 */

import { pathToFileURL } from 'node:url';

export const NO_E2E_TESTS_SELECTED = 'No E2E tests selected';

function hasChosenTag(tags) {
  return tags.some((tag) => typeof tag === 'string' && tag.trim().length > 0);
}

/**
 * @param {string} raw Analyzer RESULT_JSON.
 * @returns {string} JSON for the PR comment poster.
 */
export function prepareCommentResultJson(raw) {
  if (typeof raw !== 'string' || raw === '') {
    return raw ?? '';
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return raw;
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return raw;
  }

  const hadPerformanceTests = Object.hasOwn(parsed, 'performance_tests');
  if (hadPerformanceTests) {
    delete parsed.performance_tests;
  }

  if (
    !Object.hasOwn(parsed, 'selected_tags') ||
    !Array.isArray(parsed.selected_tags) ||
    hasChosenTag(parsed.selected_tags)
  ) {
    return hadPerformanceTests ? JSON.stringify(parsed) : raw;
  }

  return JSON.stringify({
    ...parsed,
    selected_tags: NO_E2E_TESTS_SELECTED,
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  process.stdout.write(prepareCommentResultJson(process.env.RESULT_JSON ?? ''));
}
