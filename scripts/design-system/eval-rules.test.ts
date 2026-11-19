import { loadEvalRules, parseEvalRules, type EvalRuleConfig } from './eval-rules';

describe('loadEvalRules', () => {
  it('parses the checked-in eval-rules.json', () => {
    const configs = loadEvalRules();

    expect(configs.length).toBeGreaterThan(0);
    for (const config of configs) {
      expect(config.id).toMatch(/^design-system\//);
      expect(config.keys.length).toBeGreaterThan(0);
      expect(config.message).toContain('{{value}}');
      expect(config.message).toContain('{{key}}');
    }
  });
});

describe('parseEvalRules', () => {
  const validRule: EvalRuleConfig = {
    id: 'design-system/no-hardcoded-spacing',
    kind: 'no-numeric-literal-on-keys',
    keys: ['margin'],
    allowedValues: [0],
    message: 'No raw number {{value}} on {{key}}.',
  };

  it.each([
    [{}, '"rules" array'],
    [null, '"rules" array'],
    [
      { rules: [{ ...validRule, kind: 'no-magic-strings' }] },
      'unknown kind "no-magic-strings"',
    ],
    [{ rules: [{ ...validRule, keys: [] }] }, 'rules[0].keys'],
    [{ rules: [{ ...validRule, message: '  ' }] }, 'rules[0].message'],
    [{ rules: [{ ...validRule, allowedValues: ['0'] }] }, 'rules[0].allowedValues'],
    [{ rules: [validRule, validRule] }, 'duplicate eval rule id'],
  ])('rejects invalid source %j', (source, message) => {
    expect(() => parseEvalRules(source)).toThrow(message);
  });
});
