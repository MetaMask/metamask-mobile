import { JsonRpcEngine } from '@metamask/json-rpc-engine';

import { createOriginThrottlingMiddleware } from './OriginThrottlingMiddleware';
import {
  processOriginThrottlingRejection,
  validateOriginThrottling,
} from './spam';

jest.mock('./spam', () => ({
  processOriginThrottlingRejection: jest.fn(),
  validateOriginThrottling: jest.fn(),
}));

const jsonrpc = '2.0' as const;

describe('createOriginThrottlingMiddleware', () => {
  it('returns a middleware function', async () => {
    const middleware = createOriginThrottlingMiddleware();
    expect(middleware).toBeDefined();
  });

  it('middleware invoked function validateOriginThrottling for all requests', async () => {
    const engine = new JsonRpcEngine();
    const middleware = createOriginThrottlingMiddleware();
    engine.push(middleware);

    await engine.handle({
      jsonrpc,
      id: 1,
      method: 'this-is-a-fake-method',
    });

    expect(validateOriginThrottling).toHaveBeenCalled();
  });

  it('middleware does not invoked function processOriginThrottlingRejection if response is successful', async () => {
    const engine = new JsonRpcEngine();
    const middleware = createOriginThrottlingMiddleware();
    engine.push(middleware);
    const nextMiddleware = jest
      .fn()
      .mockImplementation((_req, res, _next, end) => {
        res.result = 'success';
        end();
      });
    engine.push(nextMiddleware);

    await engine.handle({
      jsonrpc,
      id: 1,
      method: 'this-is-a-fake-method',
    });

    expect(processOriginThrottlingRejection).not.toHaveBeenCalled();
  });

  it('middleware invoked function processOriginThrottlingRejection if response has error', async () => {
    const engine = new JsonRpcEngine();
    const middleware = createOriginThrottlingMiddleware();
    engine.push(middleware);
    const nextMiddleware = jest
      .fn()
      .mockImplementation((_req, res, _next, end) => {
        res.error = { message: 'some_message', code: '4002' };
        end();
      });
    engine.push(nextMiddleware);

    await engine.handle({
      jsonrpc,
      id: 1,
      method: 'this-is-a-fake-method',
    });

    expect(processOriginThrottlingRejection).toHaveBeenCalled();
  });
});
