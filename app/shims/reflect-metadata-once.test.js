/**
 * @jest-environment node
 */
/* global globalThis */

describe('reflect-metadata-once', () => {
  const originalReflect = globalThis.Reflect;

  afterEach(() => {
    Object.defineProperty(globalThis, 'Reflect', {
      value: originalReflect,
      configurable: true,
      writable: true,
    });
    jest.resetModules();
    jest.restoreAllMocks();
  });

  it('skips loading reflect-metadata when Reflect.metadata already exists', () => {
    const metadata = jest.fn();
    Object.defineProperty(globalThis, 'Reflect', {
      value: { metadata },
      configurable: true,
      writable: true,
    });
    jest.doMock('reflect-metadata/Reflect.js', () => {
      throw new Error('reflect-metadata should not load');
    });

    let exported;
    jest.isolateModules(() => {
      // eslint-disable-next-line import-x/no-commonjs, global-require
      exported = require('./reflect-metadata-once');
    });

    expect(exported).toEqual({});
    expect(globalThis.Reflect.metadata).toBe(metadata);
  });

  it('loads reflect-metadata when Reflect.metadata is missing', () => {
    Object.defineProperty(globalThis, 'Reflect', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    const loadReflectMetadata = jest.fn(() => {
      Object.defineProperty(globalThis, 'Reflect', {
        value: { metadata: jest.fn() },
        configurable: true,
        writable: true,
      });
      return {};
    });
    jest.doMock('reflect-metadata/Reflect.js', loadReflectMetadata);

    let exported;
    jest.isolateModules(() => {
      // eslint-disable-next-line import-x/no-commonjs, global-require
      exported = require('./reflect-metadata-once');
    });

    expect(loadReflectMetadata).toHaveBeenCalled();
    expect(typeof globalThis.Reflect.metadata).toBe('function');
    expect(exported).toEqual({});
  });

  it('loads reflect-metadata when Reflect exists without metadata', () => {
    Object.defineProperty(globalThis, 'Reflect', {
      value: {},
      configurable: true,
      writable: true,
    });
    const loadReflectMetadata = jest.fn(() => {
      globalThis.Reflect.metadata = jest.fn();
      return {};
    });
    jest.doMock('reflect-metadata/Reflect.js', loadReflectMetadata);

    jest.isolateModules(() => {
      // eslint-disable-next-line import-x/no-commonjs, global-require
      require('./reflect-metadata-once');
    });

    expect(loadReflectMetadata).toHaveBeenCalled();
    expect(typeof globalThis.Reflect.metadata).toBe('function');
  });
});
