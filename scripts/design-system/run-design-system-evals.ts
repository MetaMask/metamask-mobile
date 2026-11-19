import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { Linter, type Rule } from 'eslint';

import { parseAddedLines } from './changed-lines';
import { loadEvalRules } from './eval-rules';
import { createRuleFromConfig } from './rule-interpreter';

/**
 * Built from the JSON rule source (`eval-rules.json`). A broken source throws
 * at load so the check fails loudly instead of passing silently.
 */
export const EVAL_RULES: Record<string, Rule.RuleModule> = Object.fromEntries(
  loadEvalRules().map((config) => [config.id, createRuleFromConfig(config)]),
);

const PARSER_ID = 'design-system-evals-typescript';
const APP_SOURCE = /^app\/.+\.(?:ts|tsx|js|jsx)$/;
const OUT_OF_SCOPE = /\.(?:test|spec|stories)\.(?:ts|tsx|js|jsx)$/;

export interface LintFinding {
  filePath: string;
  line: number;
  message: string;
}

export interface EvalIo {
  readDiff: () => string;
  lintFiles: (files: readonly string[]) => readonly LintFinding[];
  write: (line: string) => void;
}

/**
 * App source the pilot lints. Tests, specs, and stories under app/ are out.
 */
export function isInScopeAppFile(filePath: string): boolean {
  return APP_SOURCE.test(filePath) && !OUT_OF_SCOPE.test(filePath);
}

/**
 * Annotate findings that sit on lines the pull request added. Findings are
 * warnings while the system is refined, so they never set a failing exit code.
 */
export function runEvals(io: EvalIo): void {
  const added = parseAddedLines(io.readDiff());
  const files = Object.keys(added).filter(isInScopeAppFile).sort();
  if (files.length === 0) {
    return;
  }

  for (const { filePath, line, message } of io.lintFiles(files)) {
    if (added[filePath]?.includes(line)) {
      io.write(formatAnnotation(filePath, line, message));
    }
  }
}

export function lintSource(filePath: string, code: string): LintFinding[] {
  const messages = createLinter().verify(code, linterConfig(), {
    filename: filePath,
  });
  const fatal = messages.find((message) => message.fatal);
  if (fatal) {
    throw new Error(`${filePath}:${fatal.line ?? 1}: ${fatal.message}`);
  }

  return messages
    .filter((message) => message.ruleId != null && message.ruleId in EVAL_RULES)
    .map(({ line, message }) => ({ filePath, line, message }));
}

export function formatAnnotation(
  filePath: string,
  line: number,
  message: string,
): string {
  const file = encodeWorkflow(filePath).replace(/:/g, '%3A').replace(/,/g, '%2C');
  return `::warning file=${file},line=${line}::${encodeWorkflow(message)}`;
}

export function formatErrorAnnotation(message: string): string {
  return `::error::${encodeWorkflow(message)}`;
}

function createLinter(): Linter {
  const linter = new Linter();
  // The parser package is CJS. tsx/jest both resolve this require.
  // eslint-disable-next-line @typescript-eslint/no-require-imports, import-x/no-commonjs
  linter.defineParser(PARSER_ID, require('@typescript-eslint/parser'));
  for (const [ruleId, rule] of Object.entries(EVAL_RULES)) {
    linter.defineRule(ruleId, rule);
  }
  return linter;
}

function linterConfig(): Linter.Config {
  return {
    parser: PARSER_ID,
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      ecmaFeatures: { jsx: true },
    },
    rules: Object.fromEntries(
      Object.keys(EVAL_RULES).map((ruleId) => [ruleId, 'warn']),
    ),
  };
}

function main(): void {
  // pull_request checkout is the merge commit. Its first parent is the base tip.
  const diff = execFileSync(
    'git',
    [
      'diff',
      '-U0',
      'HEAD^1',
      'HEAD',
      '--',
      'app/*.ts',
      'app/*.tsx',
      'app/*.js',
      'app/*.jsx',
    ],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  runEvals({
    readDiff: () => diff,
    lintFiles: (files) =>
      files.flatMap((file) => lintSource(file, readFileSync(file, 'utf8'))),
    write: (line) => {
      process.stdout.write(`${line}\n`);
    },
  });
}

function encodeWorkflow(value: string): string {
  return value.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
}

if ((process.argv[1] ?? '').endsWith('run-design-system-evals.ts')) {
  try {
    main();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    process.stdout.write(`${formatErrorAnnotation(message)}\n`);
    process.exitCode = 1;
  }
}
