'use strict';

import { createSanitizationMiddleware } from './SanitizationMiddleware';

const noop = () => {
  // does nothing
};

describe('createSanitizationMiddleware', () => {
  it('does nothing when the first param is not an object', () => {
    const sanitizationMiddleware = createSanitizationMiddleware();
    const req = {
      jsonrpc: '2.0' as const,
      id: '1',
      method: 'eth_call',
      params: ['FOO'],
    };

    sanitizationMiddleware(req, { jsonrpc: '2.0', id: 'any' }, noop, noop);

    expect(req.params[0]).toBe('FOO');
  });

  it('removes any property that is not transaction-like or topic-like', () => {
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
