import type {
  Json,
  JsonRpcParams,
  JsonRpcRequest,
  PendingJsonRpcResponse,
} from '@metamask/utils';
import { default as createTracingMiddleware, MESSAGE_TYPE } from './index';
import { TraceContext, trace, TraceName } from '../../util/trace';
import type { Span } from '@sentry/core';

const REQUEST_MOCK = {
  id: 'testId',
  method: MESSAGE_TYPE.PERSONAL_SIGN,
} as JsonRpcRequest<JsonRpcParams>;
const RESPONSE_MOCK = {} as PendingJsonRpcResponse<Json>;
const NEXT_MOCK = jest.fn();

jest.mock('../../util/trace', () => ({
  ...jest.requireActual('../../util/trace'),
  trace: jest.fn(),
}));

describe('createTracingMiddleware', () => {
  let request: JsonRpcRequest<JsonRpcParams> & { traceContext?: TraceContext };
  beforeEach(() => {
    jest.clearAllMocks();
    request = { ...REQUEST_MOCK };
  });

  it('adds trace context to request if method is send transaction', async () => {
    const mockTraceContext = { traceId: 'test-trace-id' } as unknown as Span;
    (trace as jest.Mock).mockResolvedValueOnce(mockTraceContext);

    await createTracingMiddleware()(request, RESPONSE_MOCK, NEXT_MOCK);

    expect(trace).toHaveBeenCalledWith({
      name: TraceName.Signature,
      id: 'testId',
    });
    expect(request.traceContext).toBe(mockTraceContext);
  });

  it('does not add trace context to request if method not supported', async () => {
    request.method = 'unsupportedMethod';

    await createTracingMiddleware()(request, RESPONSE_MOCK, NEXT_MOCK);

    expect(request.traceContext).toBeUndefined();
  });
  it('calls next', async () => {
    await createTracingMiddleware()(request, RESPONSE_MOCK, NEXT_MOCK);
    expect(NEXT_MOCK).toHaveBeenCalledTimes(1);
  });
});
