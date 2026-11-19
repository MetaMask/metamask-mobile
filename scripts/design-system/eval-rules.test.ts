import { readFileSync } from 'node:fs';

import { EVAL_RULES_FILE, loadEvalRules, parseEvalRules } from './eval-rules';

describe('loadEvalRules', () => {
  it('parses the checked-in eval-rules.json', () => {
    const configs = loadEvalRules();

    expect(configs.length).toBeGreaterThan(0);
    for (const config of configs) {
      expect(config.id).toMatch(/^design-system\//);
      expect(config.kind).toBe('no-numeric-literal-on-keys');
      expect(config.keys.length).toBeGreaterThan(0);
      expect(config.message).toContain('{{value}}');
      expect(config.message).toContain('{{key}}');
    }
  });

  it('points EVAL_RULES_FILE at the JSON next to the engine', () => {
    const raw = JSON.parse(readFileSync(EVAL_RULES_FILE, 'utf8')) as {
      rules: { id: string }[];
    };

    expect(raw.rules.map((rule) => rule.id)).toEqual(
      loadEvalRules().map((config) => config.id),
    );
  });
});

describe('parseEvalRules', () => {
  const validRule = {
    id: 'design-system/no-hardcoded-spacing',
    kind: 'no-numeric-literal-on-keys',
    keys: ['margin'],
    allowedValues: [0],
    message: 'No raw number {{value}} on {{key}}.',
  };

  it('accepts a valid source', () => {
    const configs = parseEvalRules({ rules: [validRule] });

    expect(configs).toEqual([validRule]);
  });

  it('rejects a source without a rules array', () => {
    expect(() => parseEvalRules({})).toThrow('"rules" array');
    expect(() => parseEvalRules(null)).toThrow('"rules" array');
  });

  it('rejects an unknown kind', () => {
    const rule = { ...validRule, kind: 'no-magic-strings' };

    expect(() => parseEvalRules({ rules: [rule] })).toThrow(
      'unknown kind "no-magic-strings"',
    );
  });

  it('rejects empty keys and a blank message', () => {
    expect(() =>
      parseEvalRules({ rules: [{ ...validRule, keys: [] }] }),
    ).toThrow('rules[0].keys');
    expect(() =>
      parseEvalRules({ rules: [{ ...validRule, message: '  ' }] }),
    ).toThrow('rules[0].message');
  });

  it('rejects non-numeric allowedValues', () => {
    const rule = { ...validRule, allowedValues: ['0'] };

    expect(() => parseEvalRules({ rules: [rule] })).toThrow(
      'rules[0].allowedValues must be an array of numbers',
    );
  });

  it('rejects duplicate rule ids', () => {
    expect(() => parseEvalRules({ rules: [validRule, validRule] })).toThrow(
      'duplicate eval rule id "design-system/no-hardcoded-spacing"',
    );
  });
});
