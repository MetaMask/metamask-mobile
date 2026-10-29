import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { mapSmartE2eOutputs } from './map-smart-e2e-outputs.mjs';

describe('mapSmartE2eOutputs', () => {
  it('keeps the E2E tag list and drops performance tags', () => {
    const out = mapSmartE2eOutputs({
      selected_tags: ['SmokeAccounts'],
      confidence: 90,
      performance_tests: {
        selected_tags: ['@PerformanceLogin', 'ALL'],
        reasoning: 'login path',
      },
    });
    assert.equal(out.ai_e2e_test_tags, '["SmokeAccounts"]');
    assert.equal(out.ai_confidence, '90');
    assert.equal(out.ai_performance_test_tags, '[]');
    assert.equal(
      out.ai_performance_test_reasoning,
      'Performance tests are not part of Smart E2E selection.',
    );
  });

  it('falls back to ALL for E2E when the result is missing', () => {
    const out = mapSmartE2eOutputs(null);
    assert.equal(out.ai_e2e_test_tags, '["ALL"]');
    assert.equal(out.ai_performance_test_tags, '[]');
    assert.equal(out.ai_confidence, '0');
  });
});
