import { fileCategories, isInScope } from './file-scope';

describe('fileCategories', () => {
  it.each([
    'app/components/Foo/__tests__/Foo.tsx',
    'app/test/helpers.ts',
    'app/tests/helpers.ts',
    'app/e2e/flow.ts',
    'app/__e2e__/flow.ts',
    'app/spec/Foo.tsx',
    'app/Specs/Foo.tsx',
    'app/components/Foo/Foo.test.tsx',
    'app/components/Foo/Foo.spec.ts',
    'app/components/Foo/Foo.e2e.js',
    'app/components/Foo/Foo.TEST.tsx',
  ])('classifies %s as a test', (path) => {
    expect(fileCategories(path).test).toBe(true);
  });

  it.each([
    'app/__mocks__/Engine.ts',
    'app/components/Foo/mock/data.ts',
    'app/components/Foo/Mocks/data.ts',
    'app/components/Foo/mock.ts',
    'app/components/Foo/mocks.tsx',
    'app/components/Foo/Foo.mock.ts',
    'app/components/Foo/Foo.mocks.tsx',
    'app/components/Foo/mock-data.ts',
    'app/components/Foo/mock_data.ts',
    'app/components/Foo/MockProvider.tsx',
  ])('classifies %s as a mock', (path) => {
    expect(fileCategories(path).mock).toBe(true);
  });

  it.each([
    'app/components/Foo/Foo.tsx',
    'app/components/Testimonial/Testimonial.tsx',
    'app/components/latest/Latest.tsx',
    'app/components/Foo/testUtils.ts',
    'app/components/mockingbird/Bird.tsx',
    'app/components/Foo/Mockup.tsx',
    'app/components/Foo/mockup.ts',
    'app/components/Foo/useMockable.ts',
    'app/components/Foo/inspect.ts',
  ])('treats %s as source code', (path) => {
    expect(fileCategories(path)).toEqual({ test: false, mock: false });
  });

  it('normalizes Windows separators', () => {
    expect(fileCategories('app\\__tests__\\Foo.tsx').test).toBe(true);
  });
});

describe('isInScope', () => {
  it.each([
    'app/components/Foo/Foo.tsx',
    'app/util/number.js',
    'app/core/Engine.ts',
    'app/components/Foo/Foo.jsx',
    'app/scripts/build.mjs',
    'app/scripts/build.cjs',
  ])('includes %s', (path) => {
    expect(isInScope(path)).toBe(true);
  });

  it.each([
    'tests/framework/AppiumElement.ts',
    'scripts/react-compiler-check/index.ts',
    'app/components/Foo/Foo.test.tsx',
    'app/__mocks__/Engine.ts',
    'app/images/logo.png',
    'app/components/Foo/styles.json',
    'application/Foo.tsx',
  ])('excludes %s', (path) => {
    expect(isInScope(path)).toBe(false);
  });
});
