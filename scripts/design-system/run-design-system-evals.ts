import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { Linter, type Rule } from 'eslint';

import { parseAddedLines } from './changed-lines';
import { SPACING_RULE_ID, spacingRule } from './spacing-rule';

/**
 * Add the next eval here. Registration, severity, and the finding filter all
 * read this map.
 */
export const EVAL_RULES: Record<string, Rule.RuleModule> = {
  [SPACING_RULE_ID]: spacingRule,
};

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
 * Keep findings that sit on lines the pull request added. Returns 1 when any
 * annotation is written.
 */
export function runEvals(io: EvalIo): number {
  const added = parseAddedLines(io.readDiff());
  const files = Object.keys(added).filter(isInScopeAppFile).sort();
  if (files.length === 0) {
    return 0;
  }

  let count = 0;
  for (const finding of io.lintFiles(files)) {
    const lines = added[finding.filePath];
    if (!lines?.includes(finding.line)) {
      continue;
    }

    io.write(formatAnnotation(finding.filePath, finding.line, finding.message));
    count += 1;
  }

  return count > 0 ? 1 : 0;
}

export function lintSource(filePath: string, code: string): LintFinding[] {
  const linter = createLinter();
  const messages = linter.verify(code, linterConfig(), { filename: filePath });
  const findings: LintFinding[] = [];

  for (const message of messages) {
    if (message.fatal) {
      throw new Error(
        `${filePath}:${message.line ?? 1}: ${message.message}`,
      );
    }

    if (
      message.line == null ||
      message.ruleId == null ||
      !(message.ruleId in EVAL_RULES)
    ) {
      continue;
    }

    findings.push({
      filePath,
      line: message.line,
      message: message.message,
    });
  }

  return findings;
}

export function formatAnnotation(
  filePath: string,
  line: number,
  message: string,
): string {
  return `::error file=${escapeProperty(filePath)},line=${line}::${escapeMessage(message)}`;
}

export function formatErrorAnnotation(message: string): string {
  return `::error::${escapeMessage(message)}`;
}

function lintRepoFiles(files: readonly string[]): LintFinding[] {
  return files.flatMap((filePath) =>
    lintSource(filePath, readFileSync(filePath, 'utf8')),
  );
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
      Object.keys(EVAL_RULES).map((ruleId) => [ruleId, 'error']),
    ),
  };
}

function main(): void {
  // pull_request checkout is the merge commit. Its first parent is the base tip.
  const diffStarted = Date.now();
  const diff = execFileSync(
    'git',
    ['diff', '-U0', 'HEAD^1', 'HEAD', '--', 'app/'],
    { encoding: 'utf8' },
  );
  const diffMs = Date.now() - diffStarted;
  const lintStarted = Date.now();
  const code = runEvals({
    readDiff: () => diff,
    lintFiles: lintRepoFiles,
    write: (line) => {
      process.stdout.write(`${line}\n`);
    },
  });
  process.stderr.write(
    `design-system-evals timing diff_ms=${diffMs} lint_ms=${Date.now() - lintStarted}\n`,
  );
  process.exitCode = code;
}

function escapeProperty(value: string): string {
  return encodeWorkflow(value).replace(/:/g, '%3A').replace(/,/g, '%2C');
}

function escapeMessage(value: string): string {
  return encodeWorkflow(value);
}

function encodeWorkflow(value: string): string {
  return value.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
}

function isEntrypoint(): boolean {
  const entry = process.argv[1] ?? '';
  return entry.endsWith('run-design-system-evals.ts');
}

if (isEntrypoint()) {
  try {
    main();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    process.stdout.write(`${formatErrorAnnotation(message)}\n`);
    process.exitCode = 1;
  }
}
