import { getCardholder } from './getCardholder';
import { CardSDK } from '../sdk/CardSDK';
import Logger from '../../../../util/Logger';
import { CardFeatureFlag } from '../../../../selectors/featureFlagController/card';

// Mock dependencies
jest.mock('../sdk/CardSDK');
jest.mock('../../../../util/Logger');

const MockedCardSDK = CardSDK as jest.MockedClass<typeof CardSDK>;
const mockedLogger = Logger as jest.Mocked<typeof Logger>;

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
        rawChainId: '0xe708',
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

      expect(result).toBeUndefined();
      expect(mockedLogger.error).toHaveBeenCalledWith(
        mockError,
        'Card: Error loading cardholder accounts',
      );
    });

    it('should handle isCardHolder method error and log it', async () => {
      const mockError = new Error('API request failed');
      mockCardSDKInstance.isCardHolder.mockRejectedValue(mockError);

      const result = await getCardholder({
        formattedAccounts: mockFormattedAccounts,
        cardFeatureFlag: mockCardFeatureFlag,
      });

      expect(result).toBeUndefined();
      expect(mockedLogger.error).toHaveBeenCalledWith(
        mockError,
        'Card: Error loading cardholder accounts',
      );
    });

    it('should handle non-Error objects and convert them to Error', async () => {
      const mockErrorString = 'Network timeout';
      mockCardSDKInstance.isCardHolder.mockRejectedValue(mockErrorString);

      const result = await getCardholder({
        formattedAccounts: mockFormattedAccounts,
        cardFeatureFlag: mockCardFeatureFlag,
      });

      expect(result).toBeUndefined();
      expect(mockedLogger.error).toHaveBeenCalledWith(
        new Error(mockErrorString),
        'Card: Error loading cardholder accounts',
      );
    });

    it('should handle null error objects', async () => {
      mockCardSDKInstance.isCardHolder.mockRejectedValue(null);

      const result = await getCardholder({
        formattedAccounts: mockFormattedAccounts,
        cardFeatureFlag: mockCardFeatureFlag,
      });

      expect(result).toBeUndefined();
      expect(mockedLogger.error).toHaveBeenCalledWith(
        new Error('null'),
        'Card: Error loading cardholder accounts',
      );
    });

    it('should handle undefined error objects', async () => {
      mockCardSDKInstance.isCardHolder.mockRejectedValue(undefined);

      const result = await getCardholder({
        formattedAccounts: mockFormattedAccounts,
        cardFeatureFlag: mockCardFeatureFlag,
      });

      expect(result).toBeUndefined();
      expect(mockedLogger.error).toHaveBeenCalledWith(
        new Error('undefined'),
        'Card: Error loading cardholder accounts',
      );
    });
  });

  describe('address extraction', () => {
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
    });

    it('should handle malformed CAIP identifiers gracefully', async () => {
      const mockResult = {
        cardholderAccounts: [
          'eip155:59144:0x1234567890abcdef1234567890abcdef12345678',
          'malformed:account:identifier',
          'eip155:59144:0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        ] as `eip155:${string}:0x${string}`[],
      };

      mockCardSDKInstance.isCardHolder.mockResolvedValue(mockResult);

      const result = await getCardholder({
        formattedAccounts: mockFormattedAccounts,
        cardFeatureFlag: mockCardFeatureFlag,
      });

      // The function should still extract what it can from the valid entries
      expect(result).toEqual([
        '0x1234567890abcdef1234567890abcdef12345678',
        'identifier', // This would be the third part of the malformed identifier
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      ]);
    });
  });
});
