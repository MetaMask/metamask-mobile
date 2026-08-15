import {
  applyExactReplacements,
  getDiagnosticsSource,
  getPrepareWriteOrder,
} from './source-instrumentation';

describe('Swaps performance source instrumentation', () => {
  const replacements = [
    {
      label: 'example probe',
      before: 'function Example() {\n',
      after:
        'function Example() {\n  // SWAPS_PERF_ANALYSIS\n  recordRender();\n',
    },
  ];

  it('prepares an exact source change', () => {
    const source = 'function Example() {\n  return null;\n}\n';

    const prepared = applyExactReplacements(source, replacements, 'prepare');

    expect(prepared).toContain('SWAPS_PERF_ANALYSIS');
  });

  it('cleans an exact prepared source change', () => {
    const source = 'function Example() {\n  return null;\n}\n';
    const prepared = applyExactReplacements(source, replacements, 'prepare');

    const cleaned = applyExactReplacements(prepared, replacements, 'cleanup');

    expect(cleaned).toBe(source);
  });

  it('refuses ambiguous source anchors', () => {
    const source = 'function Example() {\n}\nfunction Example() {\n}\n';

    expect(() =>
      applyExactReplacements(source, replacements, 'prepare'),
    ).toThrow('expected exactly one source anchor; found 2');
  });

  it('generates a bounded dev-only render buffer', () => {
    const source = getDiagnosticsSource();

    expect(source).toContain("'__SWAPS_PERF_ANALYSIS__'");
    expect(source).toContain('if (!__DEV__)');
    expect(source).toContain('MAX_RENDER_TIMESTAMPS = 200');
  });

  it('creates the diagnostics helper before files that import it', () => {
    const writeOrder = getPrepareWriteOrder();

    expect(writeOrder[0]).toBe(
      'app/components/UI/Bridge/utils/swapsPerformanceDiagnostics.ts',
    );
    expect(writeOrder.slice(1)).toContain(
      'app/components/UI/Bridge/Views/BridgeView/index.tsx',
    );
  });
});
