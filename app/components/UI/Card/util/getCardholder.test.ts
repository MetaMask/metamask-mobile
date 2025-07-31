import { getCardholder } from './getCardholder';
import { CardSDK } from '../sdk/CardSDK';
import Logger from '../../../../util/Logger';
import { CardFeatureFlag } from '../../../../selectors/featureFlagController/card';
import {
  isValidHexAddress,
  safeToChecksumAddress,
} from '../../../../util/address';
import { LINEA_CHAIN_ID } from '@metamask/swaps-controller/dist/constants';

// Mock dependencies
jest.mock('../sdk/CardSDK');
jest.mock('../../../../util/Logger');
jest.mock('../../../../util/address');
jest.mock('@metamask/swaps-controller/dist/constants', () => ({
  LINEA_CHAIN_ID: '0xe708',
}));

const MockedCardSDK = CardSDK as jest.MockedClass<typeof CardSDK>;
const mockedLogger = Logger as jest.Mocked<typeof Logger>;
const mockedIsValidHexAddress = isValidHexAddress as jest.MockedFunction<
  typeof isValidHexAddress
>;
const mockedSafeToChecksumAddress =
  safeToChecksumAddress as jest.MockedFunction<typeof safeToChecksumAddress>;

describe('getCardholder', () => {
  const mockCardFeatureFlag: CardFeatureFlag = {
    constants: {
      onRampApiUrl: 'https://api.onramp.metamask.io',
      accountsApiUrl: 'https://api.accounts.metamask.io',
    },
    chains: {
      '59144': {
        enabled: true,
        balanceScannerAddress: '0x123...' as `0x${string}`,
        foxConnectAddresses: {
          global: '0x456...' as `0x${string}`,
          us: '0x789...' as `0x${string}`,
        },
        tokens: [
          {
            address: '0xabc...',
            decimals: 18,
            enabled: true,
            name: 'Test Token',
            symbol: 'TEST',
          },
        ],
      },
    },
  };

  const mockFormattedAccounts: `eip155:${string}:0x${string}`[] = [
    'eip155:59144:0x1234567890abcdef1234567890abcdef12345678',
    'eip155:59144:0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
  ];

  let mockCardSDKInstance: jest.Mocked<CardSDK>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCardSDKInstance = {
      isCardHolder: jest.fn(),
    } as unknown as jest.Mocked<CardSDK>;

    MockedCardSDK.mockImplementation(() => mockCardSDKInstance);

    // Mock address utilities
    mockedIsValidHexAddress.mockReturnValue(true);
    mockedSafeToChecksumAddress.mockImplementation(
      (address) => address as `0x${string}`,
    );
  });

  describe('successful scenarios', () => {
    it('should return cardholder addresses when accounts are cardholders', async () => {
      const mockResult = {
        cardholderAccounts: [
          'eip155:59144:0x1234567890abcdef1234567890abcdef12345678',
          'eip155:59144:0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        ] as `eip155:${string}:0x${string}`[],
      };

      mockCardSDKInstance.isCardHolder.mockResolvedValue(mockResult);

      const result = await getCardholder({
        formattedAccounts: mockFormattedAccounts,
        cardFeatureFlag: mockCardFeatureFlag,
      });

      expect(result).toEqual([
        '0x1234567890abcdef1234567890abcdef12345678',
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      ]);
      expect(MockedCardSDK).toHaveBeenCalledWith({
        cardFeatureFlag: mockCardFeatureFlag,
        rawChainId: LINEA_CHAIN_ID,
      });
      expect(mockCardSDKInstance.isCardHolder).toHaveBeenCalledWith(
        mockFormattedAccounts,
      );
    });

    it('should return only cardholder addresses from mixed results', async () => {
      const mockResult = {
        cardholderAccounts: [
          'eip155:59144:0x1234567890abcdef1234567890abcdef12345678',
        ] as `eip155:${string}:0x${string}`[],
      };

      mockCardSDKInstance.isCardHolder.mockResolvedValue(mockResult);

      const result = await getCardholder({
        formattedAccounts: mockFormattedAccounts,
        cardFeatureFlag: mockCardFeatureFlag,
      });

      expect(result).toEqual(['0x1234567890abcdef1234567890abcdef12345678']);
    });

    it('should return empty array when no accounts are cardholders', async () => {
      const mockResult = {
        cardholderAccounts: [] as `eip155:${string}:0x${string}`[],
      };

      mockCardSDKInstance.isCardHolder.mockResolvedValue(mockResult);

      const result = await getCardholder({
        formattedAccounts: mockFormattedAccounts,
        cardFeatureFlag: mockCardFeatureFlag,
      });

      expect(result).toEqual([]);
    });
  });

  describe('early return scenarios', () => {
    it('should return empty array when cardFeatureFlag is null', async () => {
      const result = await getCardholder({
        formattedAccounts: mockFormattedAccounts,
        cardFeatureFlag: null as unknown as CardFeatureFlag,
      });

      expect(result).toEqual([]);
      expect(MockedCardSDK).not.toHaveBeenCalled();
      expect(mockCardSDKInstance.isCardHolder).not.toHaveBeenCalled();
    });

    it('should return empty array when cardFeatureFlag is undefined', async () => {
      const result = await getCardholder({
        formattedAccounts: mockFormattedAccounts,
        cardFeatureFlag: undefined as unknown as CardFeatureFlag,
      });

      expect(result).toEqual([]);
      expect(MockedCardSDK).not.toHaveBeenCalled();
      expect(mockCardSDKInstance.isCardHolder).not.toHaveBeenCalled();
    });

    it('should return empty array when formattedAccounts is empty', async () => {
      const result = await getCardholder({
        formattedAccounts: [],
        cardFeatureFlag: mockCardFeatureFlag,
      });

      expect(result).toEqual([]);
      expect(MockedCardSDK).not.toHaveBeenCalled();
      expect(mockCardSDKInstance.isCardHolder).not.toHaveBeenCalled();
    });

    it('should return empty array when formattedAccounts is null', async () => {
      const result = await getCardholder({
        formattedAccounts: null as unknown as `eip155:${string}:0x${string}`[],
        cardFeatureFlag: mockCardFeatureFlag,
      });

      expect(result).toEqual([]);
      expect(MockedCardSDK).not.toHaveBeenCalled();
      expect(mockCardSDKInstance.isCardHolder).not.toHaveBeenCalled();
    });

    it('should return empty array when formattedAccounts is undefined', async () => {
      const result = await getCardholder({
        formattedAccounts:
          undefined as unknown as `eip155:${string}:0x${string}`[],
        cardFeatureFlag: mockCardFeatureFlag,
      });

      expect(result).toEqual([]);
      expect(MockedCardSDK).not.toHaveBeenCalled();
      expect(mockCardSDKInstance.isCardHolder).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle CardSDK constructor error and log it', async () => {
      const mockError = new Error('CardSDK initialization failed');
      MockedCardSDK.mockImplementation(() => {
        throw mockError;
      });

      const result = await getCardholder({
        formattedAccounts: mockFormattedAccounts,
        cardFeatureFlag: mockCardFeatureFlag,
      });

      expect(result).toEqual([]);
      expect(mockedLogger.error).toHaveBeenCalledWith(
        mockError,
        'getCardholder::Error loading cardholder accounts',
      );
    });

    it('should handle isCardHolder method error and log it', async () => {
      const mockError = new Error('API request failed');
      mockCardSDKInstance.isCardHolder.mockRejectedValue(mockError);

      const result = await getCardholder({
        formattedAccounts: mockFormattedAccounts,
        cardFeatureFlag: mockCardFeatureFlag,
      });

      expect(result).toEqual([]);
      expect(mockedLogger.error).toHaveBeenCalledWith(
        mockError,
        'getCardholder::Error loading cardholder accounts',
      );
    });

    it('should handle non-Error objects and convert them to Error', async () => {
      const mockErrorString = 'Network timeout';
      mockCardSDKInstance.isCardHolder.mockRejectedValue(mockErrorString);

      const result = await getCardholder({
        formattedAccounts: mockFormattedAccounts,
        cardFeatureFlag: mockCardFeatureFlag,
      });

      expect(result).toEqual([]);
      expect(mockedLogger.error).toHaveBeenCalledWith(
        new Error(mockErrorString),
        'getCardholder::Error loading cardholder accounts',
      );
    });

    it('should handle null error objects', async () => {
      mockCardSDKInstance.isCardHolder.mockRejectedValue(null);

      const result = await getCardholder({
        formattedAccounts: mockFormattedAccounts,
        cardFeatureFlag: mockCardFeatureFlag,
      });

      expect(result).toEqual([]);
      expect(mockedLogger.error).toHaveBeenCalledWith(
        new Error('null'),
        'getCardholder::Error loading cardholder accounts',
      );
    });

    it('should handle undefined error objects', async () => {
      mockCardSDKInstance.isCardHolder.mockRejectedValue(undefined);

      const result = await getCardholder({
        formattedAccounts: mockFormattedAccounts,
        cardFeatureFlag: mockCardFeatureFlag,
      });

      expect(result).toEqual([]);
      expect(mockedLogger.error).toHaveBeenCalledWith(
        new Error('undefined'),
        'getCardholder::Error loading cardholder accounts',
      );
    });
  });

  describe('address extraction and validation', () => {
    it('should correctly extract addresses from CAIP account identifiers', async () => {
      const mockResult = {
        cardholderAccounts: [
          'eip155:59144:0x1111111111111111111111111111111111111111',
          'eip155:59144:0x2222222222222222222222222222222222222222',
          'eip155:59144:0x3333333333333333333333333333333333333333',
        ] as `eip155:${string}:0x${string}`[],
      };

      mockCardSDKInstance.isCardHolder.mockResolvedValue(mockResult);

      const result = await getCardholder({
        formattedAccounts: mockFormattedAccounts,
        cardFeatureFlag: mockCardFeatureFlag,
      });

      expect(result).toEqual([
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222',
        '0x3333333333333333333333333333333333333333',
      ]);
      expect(mockedSafeToChecksumAddress).toHaveBeenCalledTimes(3);
    });

    it('should handle invalid CAIP-10 format and log errors', async () => {
      const mockResult = {
        cardholderAccounts: [
          'invalid:format',
          'eip155:59144:0x1111111111111111111111111111111111111111',
          'also:invalid',
        ] as `eip155:${string}:0x${string}`[],
      };

      mockCardSDKInstance.isCardHolder.mockResolvedValue(mockResult);

      const result = await getCardholder({
        formattedAccounts: mockFormattedAccounts,
        cardFeatureFlag: mockCardFeatureFlag,
      });

      expect(result).toEqual(['0x1111111111111111111111111111111111111111']);
      expect(mockedLogger.log).toHaveBeenCalledWith(
        'getCardholder::Invalid account format: invalid:format. Expected format is CAIP-10',
      );
      expect(mockedLogger.log).toHaveBeenCalledWith(
        'getCardholder::Invalid account format: also:invalid. Expected format is CAIP-10',
      );
    });

    it('should filter out invalid hex addresses', async () => {
      const mockResult = {
        cardholderAccounts: [
          'eip155:59144:0x1111111111111111111111111111111111111111',
          'eip155:59144:0xinvalidhexaddress',
          'eip155:59144:0x2222222222222222222222222222222222222222',
        ] as `eip155:${string}:0x${string}`[],
      };

      mockCardSDKInstance.isCardHolder.mockResolvedValue(mockResult);
      mockedIsValidHexAddress
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);

      const result = await getCardholder({
        formattedAccounts: mockFormattedAccounts,
        cardFeatureFlag: mockCardFeatureFlag,
      });

      expect(result).toEqual([
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222',
      ]);
      expect(mockedIsValidHexAddress).toHaveBeenCalledTimes(3);
    });
  });
});
