'use strict';

import { createSanitizationMiddleware } from './SanitizationMiddleware';

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

  it('does nothing when already prefixed and lowercased', () => {
    const sanitizationMiddleware = createSanitizationMiddleware();
    const testTxLike = {
      jsonrpc: '2.0' as const,
      id: '1',
      method: 'eth_call',
      params: [
        {
          to: '0x123',
        },
      ],
    };

    sanitizationMiddleware(
      testTxLike,
      { jsonrpc: '2.0', id: 'any' },
      noop,
      noop,
    );
    expect(testTxLike.params[0]).toStrictEqual({ to: '0x123' });
  });

  it('does nothing to non-string permitted properties', () => {
    const sanitizationMiddleware = createSanitizationMiddleware();
    const testTxLike = {
      jsonrpc: '2.0' as const,
      id: '1',
      method: 'eth_call',
      params: [
        {
          to: 100,
        },
      ],
    };

    sanitizationMiddleware(
      testTxLike,
      { jsonrpc: '2.0', id: 'any' },
      noop,
      noop,
    );
    expect(testTxLike.params[0]).toStrictEqual({ to: 100 });
  });

  for (const blockRef of ['latest', 'pending', 'earliest']) {
    it(`does nothing to permitted properties set to ${blockRef}`, () => {
      const sanitizationMiddleware = createSanitizationMiddleware();
      const testTxLike = {
        jsonrpc: '2.0' as const,
        id: '1',
        method: 'eth_call',
        params: [
          {
            from: blockRef,
          },
        ],
      } as any;

      sanitizationMiddleware(
        testTxLike,
        { jsonrpc: '2.0', id: 'any' },
        noop,
        noop,
      );
      expect(testTxLike.params[0].from).toBe(blockRef);
    });
  }

  it('hex prefixes and lowercases any tx param that is missing one', () => {
    const sanitizationMiddleware = createSanitizationMiddleware();
    const testTxLike = {
      jsonrpc: '2.0' as const,
      id: '1',
      method: 'eth_call',
      params: [
        {
          from: '123ABC',
        },
      ],
    } as any;

    sanitizationMiddleware(
      testTxLike,
      { jsonrpc: '2.0', id: 'any' },
      noop,
      noop,
    );
    expect(testTxLike.params[0].from).toBe('0x123abc');
  });
});
