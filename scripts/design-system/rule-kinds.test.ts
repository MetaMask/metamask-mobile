import { RuleTester } from 'eslint';

import type { NumericLiteralOnKeysRuleConfig } from './eval-rules';
import { createRuleFromConfig } from './rule-kinds';

const ruleTester = new RuleTester({
  // eslint-disable-next-line @typescript-eslint/no-require-imports, import-x/no-commonjs
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
});

const spacingConfig: NumericLiteralOnKeysRuleConfig = {
  id: 'design-system/no-hardcoded-spacing',
  kind: 'no-numeric-literal-on-keys',
  keys: ['margin', 'marginTop', 'marginRight', 'padding', 'paddingLeft', 'gap'],
  allowedValues: [0],
  message: 'Hard-coded spacing value "{{value}}" on "{{key}}".',
};

ruleTester.run(
  'design-system/no-hardcoded-spacing',
  createRuleFromConfig(spacingConfig),
  {
    valid: [
      { code: 'const styles = { marginRight: 0 };', filename: 'app/Screen.tsx' },
      { code: 'const styles = { gap: 0 };', filename: 'app/Screen.tsx' },
      { code: 'const styles = { marginRight: -0 };', filename: 'app/Screen.tsx' },
      { code: 'const styles = { top: 8 };', filename: 'app/Screen.tsx' },
      {
        code: 'const styles = { marginHorizontal: 8 };',
        filename: 'app/Screen.tsx',
      },
      { code: "const styles = { marginRight: '8' };", filename: 'app/Screen.tsx' },
      {
        code: 'const node = <Box marginRight={2} />;',
        filename: 'app/Screen.tsx',
      },
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
        code: 'const styles = { marginRight: 1 };',
        filename: 'app/Screen.tsx',
        errors: [{ messageId: 'flagged' }],
      },
      {
        code: 'const styles = { marginRight: -4 };',
        filename: 'app/Screen.tsx',
        errors: [{ messageId: 'flagged', data: { value: '-4', key: 'marginRight' } }],
      },
      {
        code: 'const styles = { paddingLeft: 12, gap: 2 };',
        filename: 'app/Screen.tsx',
        errors: [{ messageId: 'flagged' }, { messageId: 'flagged' }],
      },
      {
        code: 'const node = <Box style={{ marginRight: 8 }} />;',
        filename: 'app/Screen.tsx',
        errors: [{ messageId: 'flagged' }],
      },
      {
        code: 'const styles = { marginRight: 8 }; // ds-exception:',
        filename: 'app/Screen.tsx',
        errors: [{ messageId: 'flagged' }],
      },
      {
        code: 'const styles = { marginRight: 8 }; // ds-exception:   ',
        filename: 'app/Screen.tsx',
        errors: [{ messageId: 'flagged' }],
      },
      {
        code: '// ds-exception: icon gap\nconst styles = { marginRight: 8 };',
        filename: 'app/Screen.tsx',
        errors: [{ messageId: 'flagged' }],
      },
      {
        code: 'const styles = { marginRight: 8 }; /* ds-exception: icon gap */',
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

ruleTester.run(
  'allowedValues beyond 0',
  createRuleFromConfig({ ...spacingConfig, allowedValues: [0, 2, 4] }),
  {
    valid: [
      { code: 'const styles = { marginRight: 2 };', filename: 'app/Screen.tsx' },
      { code: 'const styles = { marginRight: 4 };', filename: 'app/Screen.tsx' },
    ],
    invalid: [
      {
        code: 'const styles = { marginRight: 8 };',
        filename: 'app/Screen.tsx',
        errors: [{ messageId: 'flagged' }],
      },
      {
        code: 'const styles = { marginRight: -4 };',
        filename: 'app/Screen.tsx',
        errors: [{ messageId: 'flagged', data: { value: '-4', key: 'marginRight' } }],
      },
    ],
  },
);
