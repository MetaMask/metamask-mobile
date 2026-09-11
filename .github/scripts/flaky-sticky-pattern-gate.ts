/**
 * Stage 3 construct gates for J-patterns whose defining syntax is objective.
 *
 * Snippet-in-HEAD still allows a wrong patternId on real code (MCWP-820 /
 * PR 35290: J4 on an `expect` with no waitFor). These checks drop that class
 * of finding. J1/J2/J3/J5/J7/J9 stay prompt-only — they have no unique token.
 *
 * Matching walks CallExpressions so only executable calls satisfy a gate.
 */
import * as ts from 'typescript';

export type PatternGateInput = {
  patternId: string;
  snippet: string;
  source: string;
};

export type PatternGateResult = { ok: true } | { ok: false; reason: string };

const WAIT_FOR = 'waitFor';
const FAKE_TIMER_CALLS = new Set(['useFakeTimers', 'setSystemTime']);
const REAL_TIMER_CALLS = new Set(['setTimeout', 'setInterval', 'sleep']);
const SPY_ON = 'spyOn';

function collectCallNames(code: string): Set<string> {
  const names = new Set<string>();
  const sourceFile = ts.createSourceFile(
    'finding.tsx',
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const expr = node.expression;
      if (ts.isIdentifier(expr)) {
        names.add(expr.text);
      } else if (ts.isPropertyAccessExpression(expr)) {
        const objectText = expr.expression.getText(sourceFile);
        const prop = expr.name.text;
        // jest.setTimeout only changes the test timeout.
        if (!(objectText === 'jest' && prop === 'setTimeout')) {
          names.add(prop);
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return names;
}

function hasAny(names: Set<string>, candidates: Set<string> | string): boolean {
  if (typeof candidates === 'string') {
    return names.has(candidates);
  }
  for (const candidate of candidates) {
    if (names.has(candidate)) {
      return true;
    }
  }
  return false;
}

export function findingHasRequiredConstruct(
  input: PatternGateInput,
): PatternGateResult {
  switch (input.patternId) {
    case 'J4':
      if (!hasAny(collectCallNames(input.snippet), WAIT_FOR)) {
        return {
          ok: false,
          reason: 'J4 snippet does not contain waitFor(',
        };
      }
      return { ok: true };
    case 'J6':
      if (!hasAny(collectCallNames(input.snippet), REAL_TIMER_CALLS)) {
        return {
          ok: false,
          reason: 'J6 snippet does not contain setTimeout/setInterval/sleep',
        };
      }
      return { ok: true };
    case 'J10':
      if (!hasAny(collectCallNames(input.snippet), SPY_ON)) {
        return {
          ok: false,
          reason: 'J10 snippet does not contain spyOn(',
        };
      }
      return { ok: true };
    case 'J8': {
      const sourceNames = collectCallNames(input.source);
      const snippetNames = collectCallNames(input.snippet);
      if (
        !hasAny(sourceNames, WAIT_FOR) ||
        !hasAny(sourceNames, FAKE_TIMER_CALLS)
      ) {
        return {
          ok: false,
          reason: 'J8 file does not contain both fake timers and waitFor',
        };
      }
      if (
        !hasAny(snippetNames, WAIT_FOR) &&
        !hasAny(snippetNames, FAKE_TIMER_CALLS)
      ) {
        return {
          ok: false,
          reason: 'J8 snippet contains neither fake timers nor waitFor',
        };
      }
      return { ok: true };
    }
    default:
      return { ok: true };
  }
}
