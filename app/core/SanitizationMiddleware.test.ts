'use strict';

import {
  createSanitizationMiddleware,
  permittedKeys,
} from './SanitizationMiddleware';

const noop = () => {
  // does nothing
};

describe('createSanitizationMiddleware', () => {
  it('does nothing if the params are an object', () => {
    const sanitizationMiddleware = createSanitizationMiddleware();
    const req = {
      jsonrpc: '2.0' as const,
      id: '1',
      method: 'something_else',
      params: {
        foo: '123',
      },
    };

    sanitizationMiddleware(req, { jsonrpc: '2.0', id: 'any' }, noop, noop);

    expect(req.params).toStrictEqual({
      foo: '123',
    });
  });

  it('does nothing if the first param is not an object', () => {
    const sanitizationMiddleware = createSanitizationMiddleware();
    const req = {
      jsonrpc: '2.0' as const,
      id: '1',
      method: 'eth_call',
      params: ['FOO'],
    };

    sanitizationMiddleware(req, { jsonrpc: '2.0', id: 'any' }, noop, noop);

    expect(req.params).toStrictEqual(['FOO']);
  });

  it('does nothing if the first param is an array', () => {
    const sanitizationMiddleware = createSanitizationMiddleware();
    const req = {
      jsonrpc: '2.0' as const,
      id: '1',
      method: 'eth_call',
      params: [['FOO']],
    };

    sanitizationMiddleware(req, { jsonrpc: '2.0', id: 'any' }, noop, noop);

    expect(req.params).toStrictEqual([['FOO']]);
  });

  it('does nothing if the first param is null', () => {
    const sanitizationMiddleware = createSanitizationMiddleware();
    const req = {
      jsonrpc: '2.0' as const,
      id: '1',
      method: 'eth_call',
      params: [null],
    };

    sanitizationMiddleware(req, { jsonrpc: '2.0', id: 'any' }, noop, noop);

    expect(req.params).toStrictEqual([null]);
  });

  it('removes any properties that are not transaction-like or topic-like', () => {
    const sanitizationMiddleware = createSanitizationMiddleware();
    const testTxLike = {
      jsonrpc: '2.0' as const,
      id: '1',
      method: 'eth_call',
      params: [
        {
          foo: '123',
        },
      ],
    } as any;

    sanitizationMiddleware(
      testTxLike,
      { jsonrpc: '2.0', id: 'any' },
      noop,
      noop,
    );
    expect(testTxLike.params[0]).toStrictEqual({});
  });

  for (const permittedProperty of permittedKeys) {
    it(`leaves '${permittedProperty}' unaltered when already prefixed and lowercased`, () => {
      const sanitizationMiddleware = createSanitizationMiddleware();
      const testTxLike = {
        jsonrpc: '2.0' as const,
        id: '1',
        method: 'eth_call',
        params: [
          {
            [permittedProperty]: '0x123',
          },
        ],
      };

      sanitizationMiddleware(
        testTxLike,
        { jsonrpc: '2.0', id: 'any' },
        noop,
        noop,
      );
      expect(testTxLike.params[0]).toStrictEqual({
        [permittedProperty]: '0x123',
      });
    });

    it(`leaves '${permittedProperty}' unaltered when it has a non-string value`, () => {
      const sanitizationMiddleware = createSanitizationMiddleware();
      const testTxLike = {
        jsonrpc: '2.0' as const,
        id: '1',
        method: 'eth_call',
        params: [
          {
            [permittedProperty]: 100,
          },
        ],
      };

      sanitizationMiddleware(
        testTxLike,
        { jsonrpc: '2.0', id: 'any' },
        noop,
        noop,
      );
      expect(testTxLike.params[0]).toStrictEqual({ [permittedProperty]: 100 });
    });

    for (const blockRef of ['latest', 'pending', 'earliest']) {
      it(`leaves '${permittedProperty}' unaltered when set to ${blockRef}`, () => {
        const sanitizationMiddleware = createSanitizationMiddleware();
        const testTxLike = {
          jsonrpc: '2.0' as const,
          id: '1',
          method: 'eth_call',
          params: [
            {
              [permittedProperty]: blockRef,
            },
          ],
        } as any;

        sanitizationMiddleware(
          testTxLike,
          { jsonrpc: '2.0', id: 'any' },
          noop,
          noop,
        );
        expect(testTxLike.params[0][permittedProperty]).toBe(blockRef);
      });
    }

    it(`hex prefixes and lowercases '${permittedProperty}'`, () => {
      const sanitizationMiddleware = createSanitizationMiddleware();
      const testTxLike = {
        jsonrpc: '2.0' as const,
        id: '1',
        method: 'eth_call',
        params: [
          {
            [permittedProperty]: '123ABC',
          },
        ],
      } as any;

      sanitizationMiddleware(
        testTxLike,
        { jsonrpc: '2.0', id: 'any' },
        noop,
        noop,
      );
      expect(testTxLike.params[0][permittedProperty]).toBe('0x123abc');
    });
  }
});
