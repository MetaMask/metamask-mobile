const SOURCE_EXTENSION = /\.(?:jsx?|tsx?|mjs|cjs)$/i;
const TEST_DIRECTORY = /^(?:__tests__|tests?|e2e|__e2e__|specs?)$/i;
const TEST_FILE = /\.(?:test|spec|e2e)\.[^.]+$/i;
const MOCK_DIRECTORY = /^(?:__mocks__|mocks?)$/i;
const MOCK_FILE = /(?:^|\.)(?:mock|mocks)\.[^.]+$/i;
const MOCK_FILE_PREFIX = /^(?:mock[-_]|Mock[A-Z])/;

export const SOURCE_ROOT = 'app/';

export function fileCategories(filePath: string): {
  test: boolean;
  mock: boolean;
} {
  const segments = filePath.replace(/\\/g, '/').split('/');
  const name = segments.at(-1) ?? '';
  const directories = segments.slice(0, -1);
  return {
    test:
      directories.some((part) => TEST_DIRECTORY.test(part)) ||
      TEST_FILE.test(name),
    mock:
      directories.some((part) => MOCK_DIRECTORY.test(part)) ||
      MOCK_FILE.test(name) ||
      MOCK_FILE_PREFIX.test(name),
  };
}

export function isInScope(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  if (!normalized.startsWith(SOURCE_ROOT) || !SOURCE_EXTENSION.test(normalized)) {
    return false;
  }
  const { test, mock } = fileCategories(normalized);
  return !test && !mock;
}
