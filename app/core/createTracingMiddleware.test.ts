/* eslint-disable @typescript-eslint/no-explicit-any */
import { trace } from '../util/trace';

import {
  default as createTracingMiddleware,
  MESSAGE_TYPE,
} from './createTracingMiddleware';

const REQUEST_MOCK = {
  id: 'testId',
  method: MESSAGE_TYPE.ETH_SEND_TRANSACTION,
} as any;

jest.mock('../util/trace', () => ({
  ...jest.requireActual('../util/trace'),
  trace: jest.fn(),
}));

const RESPONSE_MOCK = {};
const NEXT_MOCK = jest.fn();
const TRACE_CONTEXT_MOCK = {
  id: 'testId',
  name: 'Transaction',
};

describe('createTracingMiddleware', () => {
  let request: any;
  const traceMock = trace as jest.Mock;

  beforeEach(() => {
    jest.resetAllMocks();
    traceMock.mockResolvedValue(TRACE_CONTEXT_MOCK);
    request = { ...REQUEST_MOCK };
  });

  it('adds trace context to request if method is send transaction', async () => {
    await createTracingMiddleware()(request, RESPONSE_MOCK, NEXT_MOCK);

    expect(request.traceContext).toBe(TRACE_CONTEXT_MOCK);
  });

  it('does not add trace context to request if method not supported', async () => {
    request.method = 'NOT_SUPPORTED';

    await createTracingMiddleware()(request, RESPONSE_MOCK, NEXT_MOCK);

    expect(request.traceContext).toBeUndefined();
  });

  it('calls next', async () => {
    await createTracingMiddleware()(request, RESPONSE_MOCK, NEXT_MOCK);

    expect(NEXT_MOCK).toHaveBeenCalledTimes(1);
  });
});
