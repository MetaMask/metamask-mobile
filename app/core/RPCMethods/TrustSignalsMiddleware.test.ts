import { JsonRpcEngine } from '@metamask/json-rpc-engine';
import type { JsonRpcRequest, JsonRpcParams } from '@metamask/utils';
import type { PhishingController } from '@metamask/phishing-controller';
import type { NetworkController } from '@metamask/network-controller';
import Logger from '../../util/Logger';
import { createTrustSignalsMiddleware } from './TrustSignalsMiddleware';
import {
  parseTypedDataMessage,
  extractSpenderFromApprovalData,
  extractSpenderFromPermitMessage,
  hasValidTransactionParams,
  hasValidTypedDataParams,
  isEthSendTransaction,
  isEthSignTypedData,
  scanAddress,
  scanUrl,
} from '../../lib/address-scanning/address-scan-util';

jest.mock('../../util/Logger', () => ({
  log: jest.fn(),
}));

jest.mock('../../lib/address-scanning/address-scan-util', () => {
  const actual = jest.requireActual<
    typeof import('../../lib/address-scanning/address-scan-util')
  >('../../lib/address-scanning/address-scan-util');
  return {
    ...actual,
    parseTypedDataMessage: jest.fn(),
    extractSpenderFromApprovalData: jest.fn(),
    extractSpenderFromPermitMessage: jest.fn(),
    hasValidTransactionParams: jest.fn(),
    hasValidTypedDataParams: jest.fn(),
    isEthSendTransaction: jest.fn(),
    isEthSignTypedData: jest.fn(),
    scanAddress: jest.fn(),
    scanUrl: jest.fn(),
  };
});

const mockLogger = Logger as jest.Mocked<typeof Logger>;
const mockParseTypedDataMessage = parseTypedDataMessage as jest.MockedFunction<
  typeof parseTypedDataMessage
>;
const mockExtractSpenderFromApprovalData =
  extractSpenderFromApprovalData as jest.MockedFunction<
    typeof extractSpenderFromApprovalData
  >;
const mockExtractSpenderFromPermitMessage =
  extractSpenderFromPermitMessage as jest.MockedFunction<
    typeof extractSpenderFromPermitMessage
  >;
const mockHasValidTransactionParams =
  hasValidTransactionParams as jest.MockedFunction<
    typeof hasValidTransactionParams
  >;
const mockHasValidTypedDataParams =
  hasValidTypedDataParams as jest.MockedFunction<
    typeof hasValidTypedDataParams
  >;
const mockIsEthSendTransaction = isEthSendTransaction as jest.MockedFunction<
  typeof isEthSendTransaction
>;
const mockIsEthSignTypedData = isEthSignTypedData as jest.MockedFunction<
  typeof isEthSignTypedData
>;
const mockScanAddress = scanAddress as jest.MockedFunction<typeof scanAddress>;
const mockScanUrl = scanUrl as jest.MockedFunction<typeof scanUrl>;

const jsonrpc = '2.0' as const;

function createMockPhishingController(): PhishingController {
  return {
    scanAddress: jest.fn().mockResolvedValue(undefined),
    scanUrl: jest.fn().mockResolvedValue(undefined),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    state: { addressScanCache: {}, urlScanCache: {} } as any,
  } as unknown as PhishingController;
}

function createMockNetworkController(options?: {
  chainId?: string;
  selectedNetworkClientId?: string;
}): NetworkController {
  const chainId = options?.chainId ?? '0x1';
  const selectedNetworkClientId =
    options?.selectedNetworkClientId ?? 'test-network';

  return {
    state: {
      selectedNetworkClientId,
    },
    getNetworkConfigurationByNetworkClientId: jest
      .fn()
      .mockReturnValue({ chainId }),
  } as unknown as NetworkController;
}

function createNetworkControllerWithoutChain(): NetworkController {
  return {
    state: {},
    getNetworkConfigurationByNetworkClientId: jest
      .fn()
      .mockReturnValue(undefined),
  } as unknown as NetworkController;
}

interface TrustSignalsTestRequest extends JsonRpcRequest<JsonRpcParams> {
  origin?: string;
}

async function callThroughMiddleware({
  middleware,
  request,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  middleware: any;
  request: TrustSignalsTestRequest;
}) {
  const engine = new JsonRpcEngine();
  engine.push(middleware);

  const nextMiddleware = jest
    .fn()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .mockImplementation((_req: any, res: any, _next: any, end: () => void) => {
      res.result = 'next-result';
      end();
    });

  engine.push(nextMiddleware);

  const response = await engine.handle(request);
  return { response, nextMiddleware };
}

describe('createTrustSignalsMiddleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('scans origin URL when origin is provided', async () => {
    const phishingController = createMockPhishingController();
    const networkController = createMockNetworkController();
    const origin = 'https://example.com';

    mockIsEthSendTransaction.mockReturnValue(false);
    mockIsEthSignTypedData.mockReturnValue(false);

    const middleware = createTrustSignalsMiddleware({
      phishingController,
      networkController,
    });

    await callThroughMiddleware({
      middleware,
      request: {
        jsonrpc,
        id: 1,
        method: 'eth_chainId',
        origin,
        params: [] as JsonRpcParams,
      },
    });

    expect(mockScanUrl).toHaveBeenCalledWith(phishingController, origin);
  });

  it('does not scan origin URL when origin is not provided', async () => {
    const phishingController = createMockPhishingController();
    const networkController = createMockNetworkController();

    mockIsEthSendTransaction.mockReturnValue(false);
    mockIsEthSignTypedData.mockReturnValue(false);

    const middleware = createTrustSignalsMiddleware({
      phishingController,
      networkController,
    });

    await callThroughMiddleware({
      middleware,
      request: {
        jsonrpc,
        id: null,
        method: 'eth_chainId',
        params: [],
        origin: '',
      },
    });

    expect(mockScanUrl).not.toHaveBeenCalled();
  });

  it('does not scan addresses when chainId is not available', async () => {
    const phishingController = createMockPhishingController();
    const networkController = createNetworkControllerWithoutChain();

    mockIsEthSendTransaction.mockReturnValue(true);
    mockHasValidTransactionParams.mockReturnValue(true);

    const middleware = createTrustSignalsMiddleware({
      phishingController,
      networkController,
    });

    await callThroughMiddleware({
      middleware,
      request: {
        jsonrpc,
        id: 1,
        method: 'eth_sendTransaction',
        params: [{ to: '0x1234' }] as JsonRpcParams,
      },
    });

    expect(mockScanAddress).not.toHaveBeenCalled();
  });

  it('scans transaction recipient and spender addresses for eth_sendTransaction', async () => {
    const phishingController = createMockPhishingController();
    const networkController = createMockNetworkController({ chainId: '0x1' });
    const to = '0xabc';
    const data = '0xdata';

    mockIsEthSendTransaction.mockReturnValue(true);
    mockHasValidTransactionParams.mockReturnValue(true);
    mockExtractSpenderFromApprovalData.mockReturnValue('0xspender');

    const middleware = createTrustSignalsMiddleware({
      phishingController,
      networkController,
    });

    await callThroughMiddleware({
      middleware,
      request: {
        jsonrpc,
        id: 1,
        method: 'eth_sendTransaction',
        params: [{ to, data }] as JsonRpcParams,
      },
    });

    expect(mockExtractSpenderFromApprovalData).toHaveBeenCalledWith(data);
    expect(mockScanAddress).toHaveBeenCalledWith(phishingController, '0x1', to);
    expect(mockScanAddress).toHaveBeenCalledWith(
      phishingController,
      '0x1',
      '0xspender',
    );
  });

  it('scans verifying contract and spender addresses for eth_signTypedData', async () => {
    const phishingController = createMockPhishingController();
    const networkController = createMockNetworkController({ chainId: '0x1' });

    const verifyingContract = '0xcontract';
    const spender = '0xpermitSpender';

    mockIsEthSendTransaction.mockReturnValue(false);
    mockIsEthSignTypedData.mockReturnValue(true);
    mockHasValidTypedDataParams.mockReturnValue(true);
    mockParseTypedDataMessage.mockReturnValue({
      domain: { verifyingContract },
      message: {},
      primaryType: 'Permit',
    });
    mockExtractSpenderFromPermitMessage.mockReturnValue(spender);

    const middleware = createTrustSignalsMiddleware({
      phishingController,
      networkController,
    });

    await callThroughMiddleware({
      middleware,
      request: {
        jsonrpc,
        id: 1,
        method: 'eth_signTypedData_v4',
        params: ['0x1', { message: 'data' }] as JsonRpcParams,
      },
    });

    expect(mockParseTypedDataMessage).toHaveBeenCalled();
    expect(mockScanAddress).toHaveBeenCalledWith(
      phishingController,
      '0x1',
      verifyingContract,
    );
    expect(mockScanAddress).toHaveBeenCalledWith(
      phishingController,
      '0x1',
      spender,
    );
  });

  it('logs unexpected error and still calls next middleware', async () => {
    const phishingController = createMockPhishingController();
    const networkController = createMockNetworkController();

    mockIsEthSendTransaction.mockImplementation(() => {
      throw new Error('unexpected failure');
    });
    mockIsEthSignTypedData.mockReturnValue(false);

    const middleware = createTrustSignalsMiddleware({
      phishingController,
      networkController,
    });

    const { response, nextMiddleware } = await callThroughMiddleware({
      middleware,
      request: {
        jsonrpc,
        id: 1,
        method: 'eth_sendTransaction',
        params: [] as JsonRpcParams,
      },
    });

    expect(mockLogger.log).toHaveBeenCalledWith(
      '[TrustSignalsMiddleware] Unexpected error:',
      expect.any(Error),
    );
    expect(nextMiddleware).toHaveBeenCalled();
    expect('result' in response && response.result).toBe('next-result');
  });
});
