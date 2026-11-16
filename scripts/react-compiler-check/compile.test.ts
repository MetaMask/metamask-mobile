import { compileSource, toFailure, usesFlowParser } from './compile';

describe('compileSource', () => {
  it('returns no failures for a component the compiler can optimize', () => {
    const source = `
      import React from 'react';
      export function Greeting({ name }: { name: string }) {
        return <div>{name}</div>;
      }
    `;

    expect(compileSource(source, 'app/Greeting.tsx')).toEqual([]);
  });

  it('reports a ref read during render with its location', () => {
    const source = `
      import React, { useRef } from 'react';
      export function Counter() {
        const count = useRef(0);
        return <div>{count.current}</div>;
      }
    `;

    expect(compileSource(source, 'app/Counter.tsx')).toEqual([
      expect.objectContaining({
        line: 5,
        reason: 'Cannot access refs during render',
      }),
    ]);
  });

  it('reports a file Babel cannot parse', () => {
    const [result] = compileSource('export const = ;', 'app/Broken.ts');

    expect(result.reason).toMatch(/^Babel could not transform this file:/);
  });
});

describe('usesFlowParser', () => {
  it('matches the marker parser selection', () => {
    expect(usesFlowParser('app/a.js')).toBe(true);
    expect(usesFlowParser('app/a.jsx')).toBe(true);
    expect(usesFlowParser('app/a.mjs')).toBe(true);
    expect(usesFlowParser('app/a.cjs')).toBe(false);
    expect(usesFlowParser('app/a.ts')).toBe(false);
    expect(usesFlowParser('app/a.tsx')).toBe(false);
  });
});

describe('toFailure', () => {
  it('prefers the diagnostic detail location', () => {
    expect(
      toFailure({
        kind: 'CompileError',
        fnLoc: { start: { line: 1, column: 0 } },
        detail: {
          options: {
            reason: 'Cannot access refs during render\nmore',
            details: [{ loc: { start: { line: 7, column: 3 } } }],
          },
        },
      }),
    ).toEqual({ line: 7, column: 3, reason: 'Cannot access refs during render' });
  });

  it('falls back to the skip reason and function location', () => {
    expect(
      toFailure({
        kind: 'CompileSkip',
        fnLoc: { start: { line: 4, column: 2 } },
        reason: "Skipped due to 'use no memo' directive.",
        loc: null,
      }),
    ).toEqual({
      line: 4,
      column: 2,
      reason: "Skipped due to 'use no memo' directive.",
    });
  });

  it('uses pipeline error data', () => {
    expect(
      toFailure({ kind: 'PipelineError', fnLoc: null, data: 'boom' }),
    ).toEqual({ line: 1, column: 0, reason: 'boom' });
  });
});
