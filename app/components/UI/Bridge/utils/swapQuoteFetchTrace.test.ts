import { v4 as uuidv4 } from 'uuid';
import { endTrace, trace, TraceName } from '../../../../util/trace';
import { swapQuoteFetchTrace } from './swapQuoteFetchTrace';
import type { BridgeToken } from '../types';

jest.mock('../../../../util/trace', () => ({
  ...jest.requireActual('../../../../util/trace'),
  trace: jest.fn(),
  endTrace: jest.fn(),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

const mockUuid = uuidv4 as jest.Mock<string>;
const mockTrace = trace as jest.MockedFunction<typeof trace>;
const mockEndTrace = endTrace as jest.MockedFunction<typeof endTrace>;

const sourceToken = { chainId: '0x1' } as unknown as BridgeToken;
const sameChainDestinationToken = { chainId: '0x1' } as unknown as BridgeToken;
const crossChainDestinationToken = {
  chainId: '0x89',
} as unknown as BridgeToken;

describe('swapQuoteFetchTrace', () => {
  beforeEach(() => {
    swapQuoteFetchTrace.finish('cancelled');
    jest.clearAllMocks();
    mockUuid.mockReturnValue('quote-trace-id');
  });

  it('starts a quote trace with request correlation and route data', () => {
    const traceId = swapQuoteFetchTrace.start({
      sourceToken,
      destToken: crossChainDestinationToken,
      isRefresh: true,
    });

    expect(traceId).toBe('quote-trace-id');
    expect(mockTrace).toHaveBeenCalledWith({
      name: TraceName.SwapQuoteFetch,
      id: 'quote-trace-id',
      data: {
        request_id: 'quote-trace-id',
        isRefresh: true,
        swap_type: 'crosschain',
        src_chain_id: 'eip155:1',
        dest_chain_id: 'eip155:137',
      },
      startTime: expect.any(Number),
    });
  });

  it('ends the active quote trace with an explicit result', () => {
    swapQuoteFetchTrace.start({
      sourceToken,
      destToken: sameChainDestinationToken,
      isRefresh: false,
    });

    swapQuoteFetchTrace.finish('no_quotes');

    expect(mockEndTrace).toHaveBeenCalledWith({
      name: TraceName.SwapQuoteFetch,
      id: 'quote-trace-id',
      timestamp: expect.any(Number),
      data: { result: 'no_quotes' },
    });
  });
});
