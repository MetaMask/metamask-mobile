import { RuleTester } from 'eslint';

import type { EvalRuleConfig } from './eval-rules';
import { createRuleFromConfig } from './rule-interpreter';

const ruleTester = new RuleTester({
  // eslint-disable-next-line @typescript-eslint/no-require-imports, import-x/no-commonjs
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
});

const spacingConfig: EvalRuleConfig = {
  id: 'design-system/no-hardcoded-spacing',
  message: 'Hard-coded spacing value "{{value}}" on "{{key}}".',
  match: {
    node: 'Property',
    key: { oneOf: ['marginTop', 'marginRight', 'padding', 'gap'] },
    value: { type: 'number', except: [0] },
  },
};

ruleTester.run(
  'design-system/no-hardcoded-spacing',
  createRuleFromConfig(spacingConfig),
  {
    valid: [
      { code: 'const styles = { marginRight: 0 };', filename: 'app/Screen.tsx' },
      { code: 'const styles = { marginRight: -0 };', filename: 'app/Screen.tsx' },
      { code: 'const styles = { top: 8 };', filename: 'app/Screen.tsx' },
      {
        code: 'const styles = { marginHorizontal: 8 };',
        filename: 'app/Screen.tsx',
      },
      { code: "const styles = { marginRight: '8' };", filename: 'app/Screen.tsx' },
      {
        code: 'const node = <Box marginRight={8} />;',
        filename: 'app/Screen.tsx',
      },
      {
        code: 'const styles = { marginRight: 8 }; // ds-exception: icon gap',
        filename: 'app/Screen.tsx',
      },
    ],
    invalid: [
      {
        code: 'const styles = { marginRight: 8 };',
        filename: 'app/Screen.tsx',
        errors: [{ messageId: 'flagged', data: { value: '8', key: 'marginRight' } }],
      },
      {
        code: 'const styles = { marginRight: -4 };',
        filename: 'app/Screen.tsx',
        errors: [{ messageId: 'flagged', data: { value: '-4', key: 'marginRight' } }],
      },
      {
        code: 'const node = <Box style={{ marginRight: 8 }} />;',
        filename: 'app/Screen.tsx',
        errors: [{ messageId: 'flagged' }],
      },
      {
        code: '// ds-exception: icon gap\nconst styles = { marginRight: 8 };',
        filename: 'app/Screen.tsx',
        errors: [{ messageId: 'flagged' }],
      },
      {
        code: [
          'export const seed = {',
          '  marginRight: 0,',
          '  marginTop: 8,',
          '  padding: 1,',
          '  gap: 4, // ds-exception: local seed, keep the raw gap',
          '  top: 12,',
          '};',
        ].join('\n'),
        filename: 'app/Screen.tsx',
        errors: [
          { messageId: 'flagged', line: 3, data: { value: '8', key: 'marginTop' } },
          { messageId: 'flagged', line: 4, data: { value: '1', key: 'padding' } },
        ],
      },
    ],
  },
);

// Same interpreter, different rule: no new engine code, only a new config.
const hexColorConfig: EvalRuleConfig = {
  id: 'design-system/no-hex-color',
  message: 'Hard-coded color "{{value}}" on "{{key}}".',
  match: {
    node: 'Property',
    key: { pattern: '[Cc]olor$' },
    value: { type: 'string', pattern: '^#[0-9a-fA-F]{3,8}$' },
  },
};

ruleTester.run('design-system/no-hex-color', createRuleFromConfig(hexColorConfig), {
  valid: [
    { code: 'const styles = { color: "red" };', filename: 'app/Screen.tsx' },
    {
      code: 'const styles = { backgroundColor: colors.primary };',
      filename: 'app/Screen.tsx',
    },
  ],
  invalid: [
    {
      code: 'const styles = { backgroundColor: "#ffffff" };',
      filename: 'app/Screen.tsx',
      errors: [
        { messageId: 'flagged', data: { value: '"#ffffff"', key: 'backgroundColor' } },
      ],
    },
  ],
});
