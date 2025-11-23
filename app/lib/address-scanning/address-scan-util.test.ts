import type { JsonRpcParams } from '@metamask/utils';
import type { PhishingController } from '@metamask/phishing-controller';
import Logger from '../../util/Logger';
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
} from './address-scan-util';
import { PRIMARY_TYPES_PERMIT } from '../../components/Views/confirmations/constants/signatures';
import { parseApprovalTransactionData } from '../../components/Views/confirmations/utils/approvals';
import { parseAndNormalizeSignTypedData } from '../../components/Views/confirmations/utils/signature';
import { parseStandardTokenTransactionData } from '../../components/Views/confirmations/utils/transaction';

jest.mock('../../util/Logger', () => ({
  log: jest.fn(),
}));

jest.mock('../../components/Views/confirmations/utils/approvals', () => ({
  parseApprovalTransactionData: jest.fn(),
}));

jest.mock('../../components/Views/confirmations/utils/signature', () => ({
  parseAndNormalizeSignTypedData: jest.fn(),
}));

jest.mock('../../components/Views/confirmations/utils/transaction', () => ({
  parseStandardTokenTransactionData: jest.fn(),
}));

const mockLogger = Logger as jest.Mocked<typeof Logger>;
const mockParseApprovalTransactionData =
  parseApprovalTransactionData as jest.MockedFunction<
    typeof parseApprovalTransactionData
  >;
const mockParseAndNormalizeSignTypedData =
  parseAndNormalizeSignTypedData as jest.MockedFunction<
    typeof parseAndNormalizeSignTypedData
  >;
const mockParseStandardTokenTransactionData =
  parseStandardTokenTransactionData as jest.MockedFunction<
    typeof parseStandardTokenTransactionData
  >;

describe('address-scan-util', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseTypedDataMessage', () => {
    it('parses typed data when JSON string is provided', () => {
      const input = '{"test":"data"}';
      const parsed = { message: { test: 'data' } };
      mockParseAndNormalizeSignTypedData.mockReturnValue(parsed as never);

      const result = parseTypedDataMessage(input);

      expect(mockParseAndNormalizeSignTypedData).toHaveBeenCalledWith(input);
      expect(result).toEqual(parsed);
    });

    it('parses typed data when object is provided', () => {
      const input = { test: 'data' };
      const parsed = { message: { test: 'data' } };
      mockParseAndNormalizeSignTypedData.mockReturnValue(parsed as never);

      const result = parseTypedDataMessage(input);

      expect(mockParseAndNormalizeSignTypedData).toHaveBeenCalledWith(
        JSON.stringify(input),
      );
      expect(result).toEqual(parsed);
    });

    it('returns undefined when parsing throws error', () => {
      mockParseAndNormalizeSignTypedData.mockImplementation(() => {
        throw new Error('parse error');
      });

      const result = parseTypedDataMessage('{"test":"data"}');

      expect(result).toBeUndefined();
    });
  });

  describe('extractSpenderFromApprovalData', () => {
    it('returns spender from first argument when approval transaction has args array', () => {
      const data = '0x1234';
      mockParseApprovalTransactionData.mockReturnValue({} as never);
      mockParseStandardTokenTransactionData.mockReturnValue({
        args: ['0xspender'],
      } as never);

      const result = extractSpenderFromApprovalData(data);

      expect(result).toBe('0xspender');
    });

    it('returns undefined when data is undefined', () => {
      const result = extractSpenderFromApprovalData(undefined);

      expect(result).toBeUndefined();
      expect(mockParseApprovalTransactionData).not.toHaveBeenCalled();
      expect(mockParseStandardTokenTransactionData).not.toHaveBeenCalled();
    });
  });

  describe('extractSpenderFromPermitMessage', () => {
    it('returns spender when primaryType is permit and message contains spender string', () => {
      const permitType = PRIMARY_TYPES_PERMIT[0];
      const typedDataMessage = {
        primaryType: permitType,
        message: {
          spender: '0xpermitSpender',
        },
      };

      const result = extractSpenderFromPermitMessage(typedDataMessage);

      expect(result).toBe('0xpermitSpender');
    });

    it('returns undefined when primaryType is not a permit type', () => {
      const typedDataMessage = {
        primaryType: 'NonPermit',
        message: {
          spender: '0xpermitSpender',
        },
      };

      const result = extractSpenderFromPermitMessage(typedDataMessage);

      expect(result).toBeUndefined();
    });
  });

  describe('hasValidTransactionParams', () => {
    it('returns true when params array contains non-null object at index 0', () => {
      const req = {
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'eth_sendTransaction',
        params: [{ to: '0x1' }] as JsonRpcParams,
      } as unknown as Parameters<typeof hasValidTransactionParams>[0];

      const result = hasValidTransactionParams(req);

      expect(result).toBe(true);
    });

    it('returns false when params is empty or first param is not an object', () => {
      const baseReq = {
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'eth_sendTransaction',
      };

      const withNoParams = {
        ...baseReq,
        params: [] as JsonRpcParams,
      } as unknown as Parameters<typeof hasValidTransactionParams>[0];

      const withNonObject = {
        ...baseReq,
        params: ['0x1'] as JsonRpcParams,
      } as unknown as Parameters<typeof hasValidTransactionParams>[0];

      expect(hasValidTransactionParams(withNoParams)).toBe(false);
      expect(hasValidTransactionParams(withNonObject)).toBe(false);
    });
  });

  describe('hasValidTypedDataParams', () => {
    it('returns true when params has at least two entries', () => {
      const req = {
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'eth_signTypedData',
        params: ['0x1', { message: 'test' }],
      } as unknown as Parameters<typeof hasValidTypedDataParams>[0];

      const result = hasValidTypedDataParams(req);

      expect(result).toBe(true);
    });

    it('returns false when params is missing or has fewer than two entries', () => {
      const withOneParam = {
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'eth_signTypedData',
        params: ['0x1'] as JsonRpcParams,
      } as unknown as Parameters<typeof hasValidTypedDataParams>[0];

      const withNoParams = {
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'eth_signTypedData',
        params: [] as JsonRpcParams,
      } as unknown as Parameters<typeof hasValidTypedDataParams>[0];

      expect(hasValidTypedDataParams(withOneParam)).toBe(false);
      expect(hasValidTypedDataParams(withNoParams)).toBe(false);
    });
  });

  describe('isEthSendTransaction', () => {
    it('returns true for eth_sendTransaction method', () => {
      const req = {
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'eth_sendTransaction',
      } as unknown as Parameters<typeof isEthSendTransaction>[0];

      expect(isEthSendTransaction(req)).toBe(true);
    });

    it('returns false for non-transaction methods', () => {
      const req = {
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'eth_signTypedData',
      } as unknown as Parameters<typeof isEthSendTransaction>[0];

      expect(isEthSendTransaction(req)).toBe(false);
    });
  });

  describe('isEthSignTypedData', () => {
    it.each([
      'eth_signTypedData',
      'eth_signTypedData_v1',
      'eth_signTypedData_v3',
      'eth_signTypedData_v4',
    ] as const)('returns true for %s method', (method) => {
      const req = {
        jsonrpc: '2.0' as const,
        id: 1,
        method,
      } as unknown as Parameters<typeof isEthSignTypedData>[0];

      expect(isEthSignTypedData(req)).toBe(true);
    });

    it('returns false for other methods', () => {
      const req = {
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'eth_sendTransaction',
      } as unknown as Parameters<typeof isEthSignTypedData>[0];

      expect(isEthSignTypedData(req)).toBe(false);
    });
  });

  describe('scanAddress', () => {
    const chainId = '0x1';
    const address = '0x1234';

    function createMockPhishingController(): PhishingController {
      const controllerState: {
        // chainId -> address -> boolean
        addressScanCache: Record<string, Record<string, boolean>>;
      } = {
        addressScanCache: {},
      };

      const scanAddressMock = jest
        .fn()
        .mockImplementation(
          async (scanChainId: string, scannedAddress: string) => {
            controllerState.addressScanCache[scanChainId] ??= {};
            controllerState.addressScanCache[scanChainId][scannedAddress] =
              true;
          },
        );

      return {
        scanAddress: scanAddressMock,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        state: controllerState as any,
      } as unknown as PhishingController;
    }

    it('calls phishingController.scanAddress and logs cache on success', async () => {
      const phishingController = createMockPhishingController();

      await scanAddress(phishingController, chainId, address);

      expect(phishingController.scanAddress).toHaveBeenCalledWith(
        chainId,
        address,
      );

      expect(phishingController.state.addressScanCache).toEqual({
        [chainId]: {
          [address]: true,
        },
      });
    });

    it('logs error when phishingController.scanAddress throws and does not rethrow', async () => {
      const phishingController = {
        scanAddress: jest.fn().mockRejectedValue(new Error('scan failure')),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        state: { addressScanCache: {} } as any,
      } as unknown as PhishingController;

      await expect(
        scanAddress(phishingController, chainId, address),
      ).resolves.toBeUndefined();

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('[scanAddress] Failed to scan address'),
        expect.any(Error),
      );
    });
  });

  describe('scanUrl', () => {
    const origin = 'https://example.com';

    function createMockPhishingController(): PhishingController {
      const controllerState: {
        // origin -> cached result flag
        urlScanCache: Record<string, boolean>;
      } = {
        urlScanCache: {},
      };

      return {
        scanUrl: jest.fn().mockImplementation(async (scanOrigin: string) => {
          controllerState.urlScanCache[scanOrigin] = true;
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        state: controllerState as any,
      } as unknown as PhishingController;
    }

    it('calls phishingController.scanUrl and logs cache on success', async () => {
      const phishingController = createMockPhishingController();

      await scanUrl(phishingController, origin);

      expect(phishingController.scanUrl).toHaveBeenCalledWith(origin);
      expect(phishingController.state.urlScanCache).toEqual({
        [origin]: true,
      });
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('[scanUrl] Cache:'),
      );
    });

    it('logs error when phishingController.scanUrl throws and does not rethrow', async () => {
      const phishingController = {
        scanUrl: jest.fn().mockRejectedValue(new Error('scan failure')),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        state: { urlScanCache: {} } as any,
      } as unknown as PhishingController;

      await expect(
        scanUrl(phishingController, origin),
      ).resolves.toBeUndefined();
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('[scanUrl] Failed to scan URL'),
        expect.any(Error),
      );
    });
  });
});
