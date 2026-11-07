import { RuleTester } from 'eslint';

import { spacingRule } from './spacing-rule';

const ruleTester = new RuleTester({
  // eslint-disable-next-line @typescript-eslint/no-require-imports, import-x/no-commonjs
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
});

ruleTester.run('design-system/no-hardcoded-spacing', spacingRule, {
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
      errors: [{ messageId: 'hardcoded', data: { value: '8', key: 'marginRight' } }],
    },
    {
      code: 'const styles = { marginRight: 1 };',
      filename: 'app/Screen.tsx',
      errors: [{ messageId: 'hardcoded' }],
    },
    {
      code: 'const styles = { marginRight: -4 };',
      filename: 'app/Screen.tsx',
      errors: [{ messageId: 'hardcoded', data: { value: '-4', key: 'marginRight' } }],
    },
    {
      code: 'const styles = { paddingLeft: 12, gap: 2 };',
      filename: 'app/Screen.tsx',
      errors: [{ messageId: 'hardcoded' }, { messageId: 'hardcoded' }],
    },
    {
      code: 'const node = <Box style={{ marginRight: 8 }} />;',
      filename: 'app/Screen.tsx',
      errors: [{ messageId: 'hardcoded' }],
    },
    {
      code: 'const styles = { marginRight: 8 }; // ds-exception:',
      filename: 'app/Screen.tsx',
      errors: [{ messageId: 'hardcoded' }],
    },
    {
      code: 'const styles = { marginRight: 8 }; // ds-exception:   ',
      filename: 'app/Screen.tsx',
      errors: [{ messageId: 'hardcoded' }],
    },
    {
      code: '// ds-exception: icon gap\nconst styles = { marginRight: 8 };',
      filename: 'app/Screen.tsx',
      errors: [{ messageId: 'hardcoded' }],
    },
    {
      code: 'const styles = { marginRight: 8 }; /* ds-exception: icon gap */',
      filename: 'app/Screen.tsx',
      errors: [{ messageId: 'hardcoded' }],
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
        { messageId: 'hardcoded', line: 3, data: { value: '8', key: 'marginTop' } },
        { messageId: 'hardcoded', line: 4, data: { value: '1', key: 'padding' } },
      ],
    },
  ],
});
