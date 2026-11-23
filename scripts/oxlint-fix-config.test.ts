import { buildFixConfig } from './oxlint-fix-config.mjs';

const suppressions = {
  'app/a.ts': {
    'typescript/no-floating-promises': { count: 2 },
    'react-hooks/rules-of-hooks': { count: 1 },
  },
};

const config = {
  $schema: './node_modules/oxlint/configuration_schema.json',
  options: { typeAware: true },
  plugins: ['react', 'typescript'],
  rules: {
    'prefer-const': 'error',
    'react/rules-of-hooks': 'error',
    yoda: ['warn', 'never'],
    'no-console': ['error', { allow: ['warn', 'error'] }],
    'no-debugger': 'off',
  },
  overrides: [
    {
      files: ['*.ts'],
      rules: {
        'typescript/no-floating-promises': 'error',
        'typescript/array-type': 'error',
      },
    },
    { files: ['scripts/**'], rules: { 'no-console': 'off' } },
  ],
};

describe('buildFixConfig', () => {
  it('turns off rules that have bulk suppressions, at the top level and in overrides', () => {
    const result = buildFixConfig(config, suppressions);

    expect(result.rules['react/rules-of-hooks']).toBe('off');
    expect(result.overrides[0].rules['typescript/no-floating-promises']).toBe(
      'off',
    );
  });

  it('downgrades every other rule to a warning and keeps its options', () => {
    const result = buildFixConfig(config, suppressions);

    expect(result.rules['prefer-const']).toBe('warn');
    expect(result.rules.yoda).toEqual(['warn', 'never']);
    expect(result.rules['no-console']).toEqual([
      'warn',
      { allow: ['warn', 'error'] },
    ]);
    expect(result.overrides[0].rules['typescript/array-type']).toBe('warn');
  });

  it('leaves rules that are off unchanged', () => {
    const result = buildFixConfig(config, suppressions);

    expect(result.rules['no-debugger']).toBe('off');
    expect(result.overrides[1].rules['no-console']).toBe('off');
  });

  it('turns off type-aware linting and drops $schema', () => {
    const result = buildFixConfig(config, suppressions);

    expect(result.options.typeAware).toBe(false);
    expect(result).not.toHaveProperty('$schema');
  });

  it('keeps plugins and override file globs', () => {
    const result = buildFixConfig(config, suppressions);

    expect(result.plugins).toEqual(config.plugins);
    expect(result.overrides.map((override) => override.files)).toEqual([
      ['*.ts'],
      ['scripts/**'],
    ]);
  });

  it('does not modify the input config', () => {
    const before = JSON.parse(JSON.stringify(config));

    buildFixConfig(config, suppressions);

    expect(config).toEqual(before);
  });
});
