import { loadEvalRules, parseEvalRules } from './eval-rules';

describe('loadEvalRules', () => {
  it('parses the checked-in eval-rules.json', () => {
    const configs = loadEvalRules();

    expect(configs.length).toBeGreaterThan(0);
    for (const config of configs) {
      expect(config.id).toMatch(/^design-system\//);
      expect(config.message).toContain('{{value}}');
      expect(config.message).toContain('{{key}}');
    }
  });

  it('returns no rules instead of throwing when the file is missing', () => {
    expect(loadEvalRules('/nonexistent/eval-rules.json')).toEqual([]);
  });
});

describe('parseEvalRules', () => {
  const validRule = {
    id: 'design-system/no-hardcoded-spacing',
    message: 'No raw number {{value}} on {{key}}.',
    match: {
      node: 'Property',
      key: { oneOf: ['margin'] },
      value: { type: 'number', except: [0] },
    },
  };
  const withMatch = (match: unknown) => ({ rules: [{ ...validRule, match }] });

  it.each([
    [{}, '"rules" array'],
    [null, '"rules" array'],
    [{ rules: [validRule, validRule] }, 'duplicate eval rule id'],
    [
      withMatch({ ...validRule.match, node: 'JSXAttribute' }),
      'rules[0].match.node "JSXAttribute" is not supported',
    ],
    [
      withMatch({ ...validRule.match, key: {} }),
      'rules[0].match.key takes exactly one of "oneOf" or "pattern"',
    ],
    [
      withMatch({ ...validRule.match, key: { oneOf: ['margin'], pattern: '^m' } }),
      'rules[0].match.key takes exactly one of "oneOf" or "pattern"',
    ],
    [
      withMatch({ ...validRule.match, key: { pattern: '(' } }),
      'rules[0].match.key.pattern is not a valid regex',
    ],
    [
      withMatch({ ...validRule.match, value: { type: 'string' } }),
      'rules[0].match.value.pattern is required',
    ],
    [
      withMatch({ ...validRule.match, value: { type: 'boolean' } }),
      'rules[0].match.value.type "boolean" is not supported',
    ],
    [
      withMatch({ ...validRule.match, value: { type: 'number', except: '0' } }),
      'rules[0].match.value.except must be an array of numbers',
    ],
  ])('rejects invalid source %j', (source, message) => {
    expect(() => parseEvalRules(source)).toThrow(message);
  });
});
