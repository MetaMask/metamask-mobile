import { MESSAGE_TYPE } from '../../createTracingMiddleware';
import logWeb3ShimUsage from '.';

describe('logWeb3ShimUsage', () => {
  let mockEnd;
  let mockGetWeb3ShimUsageState;
  let mockSetWeb3ShimUsageRecorded;

  beforeEach(() => {
    mockEnd = jest.fn();
    mockGetWeb3ShimUsageState = jest.fn().mockReturnValue(undefined);
    mockSetWeb3ShimUsageRecorded = jest.fn();
  });

  it('should call getWeb3ShimUsageState and setWeb3ShimUsageRecorded when the handler is invoked', async () => {
    const req = {
      origin: 'testOrigin',
      params: [],
      id: '22',
      jsonrpc: '2.0',
      method: MESSAGE_TYPE.LOG_WEB3_SHIM_USAGE,
    };

    const res = {
      id: '22',
      jsonrpc: '2.0',
      result: true,
    };

    logWeb3ShimUsage.implementation(req, res, jest.fn(), mockEnd, {
      getWeb3ShimUsageState: mockGetWeb3ShimUsageState,
      setWeb3ShimUsageRecorded: mockSetWeb3ShimUsageRecorded,
    });

    expect(mockGetWeb3ShimUsageState).toHaveBeenCalledWith(req.origin);
    expect(mockSetWeb3ShimUsageRecorded).toHaveBeenCalled();
    expect(res.result).toStrictEqual(true);
    expect(mockEnd).toHaveBeenCalled();
  });
});
