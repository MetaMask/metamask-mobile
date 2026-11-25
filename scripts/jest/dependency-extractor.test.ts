import { extractDependencies } from './dependency-extractor';

describe('extractDependencies', () => {
  it('drops type-only imports and keeps value imports', () => {
    const deps = extractDependencies(
      `
        import type { Foo } from './foo';
        import { type Bar, baz } from './bar';
        import { type Only } from './only';
        export type { Quux } from './quux';
        export { value } from './value';
      `,
      'app/Example.tsx',
    );

    expect(deps).toEqual(['./bar', './value']);
  });

  it('ignores a factory mock and keeps an automock', () => {
    const deps = extractDependencies(
      `
        import store from '../../store';
        jest.mock('../../store', () => ({ store: {} }));
        jest.mock('../../core/Engine');
      `,
      'app/components/Example.test.tsx',
    );

    expect(deps).toEqual(['../../core/Engine']);
  });

  it('keeps a factory-mocked module when the file calls requireActual or unmock', () => {
    const deps = extractDependencies(
      `
        jest.mock('../../store', () => ({ store: {} }));
        jest.requireActual('../../store');
        jest.mock('../../core/Engine', () => ({}));
        jest.unmock('../../core/Engine');
      `,
      'app/components/Example.test.tsx',
    );

    expect(deps.sort()).toEqual(['../../core/Engine', '../../store']);
  });

  it('cuts factory mocks in the setup file unless that file calls requireActual', () => {
    const deps = extractDependencies(
      `
        import store from '../../store';
        jest.mock('../../store', () => ({ store: {} }));
        jest.mock('../../core/Engine', () => ({ context: {} }));
        jest.requireActual('react-native');
      `,
      'app/util/test/testSetup.js',
    );

    expect(deps).toEqual(['react-native']);
  });
});
