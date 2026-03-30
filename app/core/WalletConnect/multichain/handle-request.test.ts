import { routeNonEvmToSnap } from './handle-request';
import type { NonEvmChainAdapter, NonEvmSessionRequest } from './types';

const mockGetAdapter = jest.fn();
const mockMessengerCall = jest.fn();

jest.mock('./registry', () => ({
  getNonEvmAdapterForCaipChainId: (id: string) => mockGetAdapter(id),
}));

jest.mock('../../Engine', () => ({
  __esModule: true,
  default: {
    controllerMessenger: {
      call: (...args: unknown[]) => mockMessengerCall(...args),
    },
  },
}));

jest.mock('../../SDKConnect/utils/DevLogger', () => ({
  __esModule: true,
  default: { log: jest.fn() },
}));

const buildAdapter = (
  overrides: Partial<NonEvmChainAdapter> & { namespace: string },
): NonEvmChainAdapter => ({
  redirectMethods: [],
  buildNamespaceSlice: jest.fn(),
  ...overrides,
});

const buildRequest = (
  method: string,
  params: unknown = [{ raw: 'data' }],
): NonEvmSessionRequest =>
  ({
    id: 7,
    topic: 'topic',
    params: { request: { method, params }, chainId: 'tron:728126428' },
    verifyContext: {
      verified: { origin: 'https://x', validation: 'UNKNOWN', verifyUrl: '' },
    },
  }) as unknown as NonEvmSessionRequest;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('routeNonEvmToSnap', () => {
  it('rejects the request when no adapter is registered', async () => {
    mockGetAdapter.mockReturnValue(undefined);
    const host = {
      approveRequest: jest.fn(),
      rejectRequest: jest.fn().mockResolvedValue(undefined),
    };

    await routeNonEvmToSnap({
      requestEvent: buildRequest('tron_signTransaction'),
      scope: 'tron:728126428',
      connectedAddresses: [],
      host,
    });

    expect(host.rejectRequest).toHaveBeenCalledWith({
      id: '7',
      error: expect.any(Error),
    });
    expect(host.approveRequest).not.toHaveBeenCalled();
  });

  it('normalizes the scope, maps the request, calls the messenger, and maps the response', async () => {
    const adapter = buildAdapter({
      namespace: 'tron',
      normalizeCaipChainId: jest.fn(() => 'tron:728126428'),
      mapRequest: jest.fn(({ method, params }) => ({
        method: method.replace(/^tron_/, ''),
        params,
      })),
      mapResponse: jest.fn(({ result }) => ({ wrapped: result })),
    });
    mockGetAdapter.mockReturnValue(adapter);
    mockMessengerCall.mockResolvedValue('snap-result');

    const host = {
      approveRequest: jest.fn().mockResolvedValue(undefined),
      rejectRequest: jest.fn(),
    };

    await routeNonEvmToSnap({
      requestEvent: buildRequest('tron_signMessage', [{ message: '0x1' }]),
      scope: 'tron:728126428',
      connectedAddresses: ['tron:728126428:TX'],
      host,
    });

    expect(adapter.normalizeCaipChainId).toHaveBeenCalledWith('tron:728126428');
    expect(mockMessengerCall).toHaveBeenCalledWith(
      'MultichainRoutingService:handleRequest',
      expect.objectContaining({
        scope: 'tron:728126428',
        connectedAddresses: ['tron:728126428:TX'],
        request: expect.objectContaining({ method: 'signMessage' }),
      }),
    );
    expect(host.approveRequest).toHaveBeenCalledWith({
      id: '7',
      result: { wrapped: 'snap-result' },
    });
  });

  it('forwards messenger errors to rejectRequest', async () => {
    const adapter = buildAdapter({ namespace: 'tron' });
    mockGetAdapter.mockReturnValue(adapter);
    const error = new Error('snap rejected');
    mockMessengerCall.mockRejectedValue(error);

    const host = {
      approveRequest: jest.fn(),
      rejectRequest: jest.fn().mockResolvedValue(undefined),
    };

    await routeNonEvmToSnap({
      requestEvent: buildRequest('tron_signTransaction'),
      scope: 'tron:728126428',
      connectedAddresses: [],
      host,
    });

    expect(host.rejectRequest).toHaveBeenCalledWith({ id: '7', error });
  });
});
