import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  NO_E2E_TESTS_SELECTED,
  prepareCommentResultJson,
} from './prepare-smart-e2e-comment.mjs';

describe('prepareCommentResultJson', () => {
  it('shows No E2E tests selected when no tags were chosen', () => {
    const commentJson = prepareCommentResultJson(
      JSON.stringify({
        selected_tags: [],
        confidence: 95,
        reasoning: 'No smoke tags warranted.',
        performance_tests: { selected_tags: [], reasoning: 'none' },
      }),
    );

    assert.deepEqual(JSON.parse(commentJson), {
      selected_tags: NO_E2E_TESTS_SELECTED,
      confidence: 95,
      reasoning: 'No smoke tags warranted.',
      performance_tests: { selected_tags: [], reasoning: 'none' },
    });
  });

  it('treats blank tag strings as no selection', () => {
    const commentJson = prepareCommentResultJson(
      JSON.stringify({ selected_tags: ['', '   '] }),
    );

    assert.equal(
      JSON.parse(commentJson).selected_tags,
      NO_E2E_TESTS_SELECTED,
    );
  });

  it('leaves a real tag selection unchanged', () => {
    const raw = JSON.stringify({
      selected_tags: ['SmokeAccounts'],
      confidence: 90,
    });

    assert.equal(prepareCommentResultJson(raw), raw);
  });

  it('leaves a missing tag field unchanged', () => {
    const raw = JSON.stringify({ confidence: 0 });

    assert.equal(prepareCommentResultJson(raw), raw);
  });

  it('passes invalid JSON through for the comment poster', () => {
    assert.equal(prepareCommentResultJson('not-json'), 'not-json');
  });
});
