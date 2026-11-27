/**
 * Pure helpers for scripts/jest-related.mjs (kept apart so unit tests can import
 * them without running the CLI).
 */
import path from 'node:path';

// Linux limits the total size of command-line arguments to about 2 MB.
const MAX_ARGV_BYTES = 1_500_000;
const NO_MATCH_PATH = path.resolve('.jest-related-no-matching-suite');

/**
 * Splits a package.json script into words, honouring single and double quotes
 * (the unit script quotes a pattern that contains `|`).
 *
 * @param {string} command
 * @returns {string[]}
 */
export function splitShellWords(command) {
  const words = [];
  let current = '';
  let quote = null;
  let inWord = false;
  for (const char of command) {
    if (quote) {
      if (char === quote) {
        quote = null;
      } else {
        current += char;
      }
    } else if (char === "'" || char === '"') {
      quote = char;
      inWord = true;
    } else if (/\s/.test(char)) {
      if (inWord) {
        words.push(current);
        current = '';
        inWord = false;
      }
    } else {
      current += char;
      inWord = true;
    }
  }
  if (quote) {
    throw new Error(`Unterminated quote in script: ${command}`);
  }
  if (inWord) {
    words.push(current);
  }
  return words;
}

/**
 * Describes how to call Jest for a package script. A script that invokes
 * `jest` directly may carry positional roots (`jest ./app/ ./locales/`); those
 * cannot be combined with `--findRelatedTests`, which reads every positional
 * argument as a changed file, so only its flags are kept. Flags that take a
 * value must use the `--flag=value` form for that to hold. Any other script
 * (such as `yarn test:view:base ...`) is called through yarn as it is.
 *
 * @param {string} scriptName
 * @param {string} command
 * @returns {{ direct: boolean, base: string[] }}
 */
export function describeJestScript(scriptName, command) {
  const words = splitShellWords(command);
  if (words[0] !== 'jest') {
    return { direct: false, base: [scriptName] };
  }
  return {
    direct: true,
    base: ['jest', ...words.slice(1).filter((word) => word.startsWith('-'))],
  };
}

/**
 * Suites Jest found for the changed files that the full run would also run.
 *
 * @param {string[]} related
 * @param {string[]} all
 * @returns {string[]}
 */
export function selectSuites(related, all) {
  const allowed = new Set(all);
  return [...new Set(related)].filter((suite) => allowed.has(suite)).sort();
}

/**
 * @param {string} scriptName
 * @param {string[]} passthrough
 * @param {string[]} selected
 * @param {number} totalSuites
 * @param {{ direct: boolean, base: string[] }} jestScript
 * @returns {string[]} the yarn arguments to run
 */
export function buildRunArgs(
  scriptName,
  passthrough,
  selected,
  totalSuites,
  jestScript,
) {
  const full = [scriptName, ...passthrough];
  if (selected.length === totalSuites) {
    return full;
  }
  const args = [
    ...jestScript.base,
    ...passthrough,
    '--passWithNoTests',
    '--runTestsByPath',
    ...(selected.length > 0 ? selected : [NO_MATCH_PATH]),
  ];
  const bytes = args.reduce((sum, arg) => sum + arg.length + 1, 0);
  return bytes > MAX_ARGV_BYTES ? full : args;
}
