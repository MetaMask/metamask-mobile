import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { mergeContinueResult, allowContinue } from './hard-rule-triggers';

describe('smart-e2e mergeContinueResult', () => {
  it('unions selected_tags so the model can add to the hard-rule floor', () => {
    const merged = mergeContinueResult(
      {
        selected_tags: ['SmokeAccounts'],
        confidence: 95,
        performance_tests: { selected_tags: [], reasoning: 'seed' },
      },
      {
        selected_tags: ['SmokeConfirmations'],
        confidence: 80,
        performance_tests: {
          selected_tags: ['@PerformanceLogin'],
          reasoning: 'login path touched',
        },
        reasoning: 'AI added confirmations',
      },
    );

    assert.deepEqual(merged.selected_tags, [
      'SmokeAccounts',
      'SmokeConfirmations',
    ]);
    assert.equal(merged.confidence, 80);
    assert.deepEqual(
      (merged.performance_tests as { selected_tags: string[] }).selected_tags,
      ['@PerformanceLogin'],
    );
  });

  it('keeps ALL when the hard-rule seed already selected ALL', () => {
    const merged = mergeContinueResult(
      { selected_tags: ['ALL'] },
      { selected_tags: ['SmokeAccounts'] },
    );
    assert.deepEqual(merged.selected_tags, ['ALL']);
  });
});

describe('smart-e2e allowContinue', () => {
  it('vetoes continue when selected_tags is ALL', () => {
    assert.equal(allowContinue({ selected_tags: ['ALL'] }), false);
  });

  it('allows continue for a filtered tag list', () => {
    assert.equal(allowContinue({ selected_tags: ['SmokeAccounts'] }), true);
  });
});
