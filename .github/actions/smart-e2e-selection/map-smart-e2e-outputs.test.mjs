import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { mapSmartE2eOutputs } from './map-smart-e2e-outputs.mjs';

describe('mapSmartE2eOutputs', () => {
  it('maps mixed performance ALL plus a tag to the run-all token', () => {
    const out = mapSmartE2eOutputs({
      selected_tags: ['ALL'],
      confidence: 100,
      performance_tests: {
        selected_tags: ['ALL', '@PerformanceLogin'],
        reasoning: 'mixed',
      },
    });
    assert.equal(out.ai_performance_test_tags, '["ALL"]');
  });

  it('maps performance ["ALL"] to the run-all token', () => {
    const out = mapSmartE2eOutputs({
      selected_tags: ['ALL'],
      confidence: 0,
      performance_tests: {
        selected_tags: ['ALL'],
        reasoning: 'fallback',
      },
    });
    assert.equal(out.ai_e2e_test_tags, '["ALL"]');
    assert.equal(out.ai_performance_test_tags, '["ALL"]');
    assert.equal(out.ai_confidence, '0');
    assert.equal(out.ai_performance_test_reasoning, 'fallback');
  });

  it('maps performance [] to a JSON empty array string', () => {
    const out = mapSmartE2eOutputs({
      selected_tags: ['ALL'],
      confidence: 100,
      performance_tests: {
        selected_tags: [],
        reasoning: 'hard rule',
      },
    });
    assert.equal(out.ai_performance_test_tags, '[]');
    assert.equal(out.ai_e2e_test_tags, '["ALL"]');
  });

  it('falls back to ALL for E2E and skips performance tests when the result is missing', () => {
    const out = mapSmartE2eOutputs(null);
    assert.equal(out.ai_e2e_test_tags, '["ALL"]');
    assert.equal(out.ai_performance_test_tags, '[]');
    assert.equal(out.ai_confidence, '0');
  });

  it('skips performance tests when performance_tests is omitted', () => {
    const out = mapSmartE2eOutputs({
      selected_tags: ['SmokeAccounts'],
      confidence: 80,
    });
    assert.equal(out.ai_e2e_test_tags, '["SmokeAccounts"]');
    assert.equal(out.ai_performance_test_tags, '[]');
  });

  it('treats a blank performance tag list as run none', () => {
    const out = mapSmartE2eOutputs({
      selected_tags: ['SmokeAccounts'],
      confidence: 90,
      performance_tests: {
        selected_tags: ['', '   '],
        reasoning: 'blank',
      },
    });
    assert.equal(out.ai_performance_test_tags, '[]');
  });

  it('maps lowercase all to the run-all token', () => {
    const out = mapSmartE2eOutputs({
      selected_tags: ['SmokeAccounts'],
      confidence: 90,
      performance_tests: {
        selected_tags: ['all'],
        reasoning: 'broad',
      },
    });
    assert.equal(out.ai_performance_test_tags, '["ALL"]');
  });

  it('stringifies specific performance tags', () => {
    const out = mapSmartE2eOutputs({
      selected_tags: ['SmokeAccounts'],
      confidence: 90,
      performance_tests: {
        selected_tags: ['@PerformanceLogin'],
        reasoning: 'login path',
      },
    });
    assert.equal(out.ai_e2e_test_tags, '["SmokeAccounts"]');
    assert.equal(out.ai_performance_test_tags, '["@PerformanceLogin"]');
  });
});
