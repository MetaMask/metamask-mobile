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
import { APPROVAL_4BYTE_SELECTORS } from '../../components/Views/confirmations/constants/approve';
import { parseApprovalTransactionData } from '../../components/Views/confirmations/utils/approvals';
import { parseAndNormalizeSignTypedData } from '../../components/Views/confirmations/utils/signature';
import {
  parseStandardTokenTransactionData,
  get4ByteCode,
} from '../../components/Views/confirmations/utils/transaction';

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
  get4ByteCode: jest.fn(),
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
const mockGet4ByteCode = get4ByteCode as jest.MockedFunction<
  typeof get4ByteCode
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
    it('returns undefined when data is undefined', () => {
      const result = extractSpenderFromApprovalData(undefined);

      expect(result).toBeUndefined();
      expect(mockParseApprovalTransactionData).not.toHaveBeenCalled();
      expect(mockParseStandardTokenTransactionData).not.toHaveBeenCalled();
    });

    it('returns undefined when parseApprovalTransactionData returns undefined', () => {
      const data = '0x1234';
      mockParseApprovalTransactionData.mockReturnValue(undefined);

      const result = extractSpenderFromApprovalData(data);

      expect(result).toBeUndefined();
      expect(mockParseStandardTokenTransactionData).not.toHaveBeenCalled();
    });

    it('returns undefined when transactionDescription has no args', () => {
      const data = '0x095ea7b31234567890';
      mockParseApprovalTransactionData.mockReturnValue({} as never);
      mockGet4ByteCode.mockReturnValue(APPROVAL_4BYTE_SELECTORS.APPROVE);
      mockParseStandardTokenTransactionData.mockReturnValue({
        name: 'approve',
      } as never);

      const result = extractSpenderFromApprovalData(data);

      expect(result).toBeUndefined();
    });

    it('returns spender from args._spender for standard ERC20 approve with named params', () => {
      const data = '0x095ea7b31234567890';
      mockParseApprovalTransactionData.mockReturnValue({} as never);
      mockGet4ByteCode.mockReturnValue(APPROVAL_4BYTE_SELECTORS.APPROVE);
      mockParseStandardTokenTransactionData.mockReturnValue({
        name: 'approve',
        args: { _spender: '0xspenderAddress', _value: '1000000' },
      } as never);

      const result = extractSpenderFromApprovalData(data);

      expect(result).toBe('0xspenderAddress');
    });

    it('returns spender from args.spender for Permit2 approve with named params', () => {
      const data = '0x87517c451234567890';
      mockParseApprovalTransactionData.mockReturnValue({} as never);
      mockGet4ByteCode.mockReturnValue(
        APPROVAL_4BYTE_SELECTORS.PERMIT2_APPROVE,
      );
      mockParseStandardTokenTransactionData.mockReturnValue({
        name: 'approve',
        args: {
          token: '0xtokenAddress',
          spender: '0xspenderAddress',
          amount: '1000000',
          expiration: '1234567890',
        },
      } as never);

      const result = extractSpenderFromApprovalData(data);

      expect(result).toBe('0xspenderAddress');
    });

    it('returns spender from args._spender for increaseAllowance with named params', () => {
      const data = '0x395093511234567890';
      mockParseApprovalTransactionData.mockReturnValue({} as never);
      mockGet4ByteCode.mockReturnValue(
        APPROVAL_4BYTE_SELECTORS.ERC20_INCREASE_ALLOWANCE,
      );
      mockParseStandardTokenTransactionData.mockReturnValue({
        name: 'increaseAllowance',
        args: { _spender: '0xspenderAddress', increment: '500000' },
      } as never);

      const result = extractSpenderFromApprovalData(data);

      expect(result).toBe('0xspenderAddress');
    });

    it('returns operator from args._operator for setApprovalForAll with named params', () => {
      const data = '0xa22cb4651234567890';
      mockParseApprovalTransactionData.mockReturnValue({} as never);
      mockGet4ByteCode.mockReturnValue(
        APPROVAL_4BYTE_SELECTORS.SET_APPROVAL_FOR_ALL,
      );
      mockParseStandardTokenTransactionData.mockReturnValue({
        name: 'setApprovalForAll',
        args: { _operator: '0xoperatorAddress', _approved: true },
      } as never);

      const result = extractSpenderFromApprovalData(data);

      expect(result).toBe('0xoperatorAddress');
    });

    it('returns undefined for unknown approval method', () => {
      const data = '0xunknown1234567890';
      mockParseApprovalTransactionData.mockReturnValue({} as never);
      mockGet4ByteCode.mockReturnValue('0xunknown12');
      mockParseStandardTokenTransactionData.mockReturnValue({
        name: 'unknownMethod',
        args: ['0xsomeAddress'],
      } as never);

      const result = extractSpenderFromApprovalData(data);

      expect(result).toBeUndefined();
    });

    it('returns undefined when spender is not a string', () => {
      const data = '0x095ea7b31234567890';
      mockParseApprovalTransactionData.mockReturnValue({} as never);
      mockGet4ByteCode.mockReturnValue(APPROVAL_4BYTE_SELECTORS.APPROVE);
      mockParseStandardTokenTransactionData.mockReturnValue({
        name: 'approve',
        args: { _spender: 123456, _value: '1000000' }, // spender is a number, not a string
      } as never);

      const result = extractSpenderFromApprovalData(data);

      expect(result).toBeUndefined();
    });

    it('returns undefined when parsing throws an error', () => {
      const data = '0x1234';
      mockParseApprovalTransactionData.mockImplementation(() => {
        throw new Error('parse error');
      });

      const result = extractSpenderFromApprovalData(data);

      expect(result).toBeUndefined();
    });

    it('returns spender from args._spender for decreaseAllowance', () => {
      const data = '0xa457c2d71234567890';
      mockParseApprovalTransactionData.mockReturnValue({} as never);
      mockGet4ByteCode.mockReturnValue(
        APPROVAL_4BYTE_SELECTORS.ERC20_DECREASE_ALLOWANCE,
      );
      mockParseStandardTokenTransactionData.mockReturnValue({
        name: 'decreaseAllowance',
        args: { _spender: '0xspenderAddress', decrement: '300000' },
      } as never);

      const result = extractSpenderFromApprovalData(data);

      expect(result).toBe('0xspenderAddress');
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

    it('calls phishingController.scanUrl and updates cache on success', async () => {
      const phishingController = createMockPhishingController();

      await scanUrl(phishingController, origin);

      expect(phishingController.scanUrl).toHaveBeenCalledWith(origin);
      expect(phishingController.state.urlScanCache).toEqual({
        [origin]: true,
      });
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
