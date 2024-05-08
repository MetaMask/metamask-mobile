import { EXCLUDE_REGEX } from './constants';

describe('Regular Expressions used in Fitness Functions', (): void => {
  describe(`EXCLUDE_REGEX "${EXCLUDE_REGEX}"`, (): void => {
    const PATHS_IT_SHOULD_MATCH = [
      '.github/file.js',
      '.github/file.ts',
      '.github/path/file.js',
      '.github/much/longer/path/file.js',
    ];

    const PATHS_IT_SHOULD_NOT_MATCH = [
      'file.js',
      'file.ts',
      'app/file.ts',
      'app/.github/file.ts',
    ];

    describe('included paths', (): void => {
      PATHS_IT_SHOULD_MATCH.forEach((path: string): void => {
        it(`should match "${path}"`, (): void => {
          const result = EXCLUDE_REGEX.test(path);

          expect(result).toStrictEqual(true);
        });
      });
    });

    describe('excluded paths', (): void => {
      PATHS_IT_SHOULD_NOT_MATCH.forEach((path: string): void => {
        it(`should not match "${path}"`, (): void => {
          const result = EXCLUDE_REGEX.test(path);

          expect(result).toStrictEqual(false);
        });
      });
    });
  });
});
