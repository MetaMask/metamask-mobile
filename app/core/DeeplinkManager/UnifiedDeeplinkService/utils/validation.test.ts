import {
  validateRequiredParams,
  isValidEthereumAddress,
  isValidChainId,
  validateAccountParam,
  isValidUrl,
  sanitizeMessage,
  DeeplinkValidator,
} from './validation';
import { DeeplinkUrlParams } from '../../ParseManager/extractURLParams';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import { createDefaultParams } from '../testUtils';

jest.mock('../../../SDKConnect/utils/DevLogger');

describe('validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateRequiredParams', () => {
    it('validates all required params are present', () => {
      const params: DeeplinkUrlParams = createDefaultParams({
        pubkey: 'test-pubkey',
        channelId: 'test-channel',
        uri: 'test-uri',
      });

      const result = validateRequiredParams(params, [
        'pubkey',
        'channelId',
        'uri',
      ]);

      expect(result).toEqual({
        isValid: true,
        errors: [],
      });
    });

    it('returns errors for missing params', () => {
      const params: DeeplinkUrlParams = createDefaultParams({
        channelId: 'test-channel',
      });

      const result = validateRequiredParams(params, [
        'pubkey',
        'channelId',
        'uri',
      ]);

      expect(result).toEqual({
        isValid: false,
        errors: [
          'Missing required parameter: pubkey',
          'Missing required parameter: uri',
        ],
      });
    });

    it('handles empty required array', () => {
      const params: DeeplinkUrlParams = createDefaultParams();

      const result = validateRequiredParams(params, []);

      expect(result).toEqual({
        isValid: true,
        errors: [],
      });
    });
  });

  describe('isValidEthereumAddress', () => {
    it('validates correct Ethereum addresses', () => {
      expect(
        isValidEthereumAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f6E123'),
      ).toBe(true);
      expect(
        isValidEthereumAddress('0x0000000000000000000000000000000000000000'),
      ).toBe(true);
      expect(
        isValidEthereumAddress('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'),
      ).toBe(true);
    });

    it('rejects invalid Ethereum addresses', () => {
      expect(isValidEthereumAddress('0x123')).toBe(false);
      expect(
        isValidEthereumAddress('742d35Cc6634C0532925a3b844Bc9e7595f6E123'),
      ).toBe(false);
      expect(
        isValidEthereumAddress('0xGGGG35Cc6634C0532925a3b844Bc9e7595f6E123'),
      ).toBe(false);
      expect(isValidEthereumAddress('invalid')).toBe(false);
      expect(isValidEthereumAddress('')).toBe(false);
    });
  });

  describe('isValidChainId', () => {
    it('validates correct chain IDs', () => {
      expect(isValidChainId('1')).toBe(true);
      expect(isValidChainId('56')).toBe(true);
      expect(isValidChainId('137')).toBe(true);
      expect(isValidChainId('42161')).toBe(true);
    });

    it('rejects invalid chain IDs', () => {
      expect(isValidChainId('0')).toBe(false);
      expect(isValidChainId('-1')).toBe(false);
      expect(isValidChainId('abc')).toBe(false);
      expect(isValidChainId('')).toBe(false);
      expect(isValidChainId('1.5')).toBe(false);
    });
  });

  describe('validateAccountParam', () => {
    it('validates correct account format', () => {
      const result = validateAccountParam(
        '0x742d35Cc6634C0532925a3b844Bc9e7595f6E123@1',
      );

      expect(result).toEqual({
        isValid: true,
        errors: [],
      });
    });

    it('rejects account without @ separator', () => {
      const result = validateAccountParam(
        '0x742d35Cc6634C0532925a3b844Bc9e7595f6E123',
      );

      expect(result).toEqual({
        isValid: false,
        errors: ['Account must be in format address@chainId'],
      });
    });

    it('rejects account with invalid address', () => {
      const result = validateAccountParam('invalid-address@1');

      expect(result).toEqual({
        isValid: false,
        errors: ['Invalid Ethereum address'],
      });
    });

    it('rejects account with invalid chain ID', () => {
      const result = validateAccountParam(
        '0x742d35Cc6634C0532925a3b844Bc9e7595f6E123@invalid',
      );

      expect(result).toEqual({
        isValid: false,
        errors: ['Invalid chain ID'],
      });
    });

    it('rejects account with both invalid address and chain ID', () => {
      const result = validateAccountParam('invalid@0');

      expect(result).toEqual({
        isValid: false,
        errors: ['Invalid Ethereum address', 'Invalid chain ID'],
      });
    });
  });

  describe('isValidUrl', () => {
    it('validates correct URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
      expect(isValidUrl('metamask://send')).toBe(true);
      expect(isValidUrl('wc:8a5e5bdc-a0e4-4702-ba63-8f1a5655744f@1')).toBe(
        true,
      );
    });

    it('rejects invalid URLs', () => {
      expect(isValidUrl('not a url')).toBe(false);
      expect(isValidUrl('example.com')).toBe(false);
      expect(isValidUrl('')).toBe(false);
      expect(isValidUrl('://invalid')).toBe(false);
    });
  });

  describe('sanitizeMessage', () => {
    it('sanitizes message with spaces', () => {
      expect(sanitizeMessage('Hello World')).toBe('Hello+World');
      expect(sanitizeMessage('Test  Multiple  Spaces')).toBe(
        'Test++Multiple++Spaces',
      );
    });

    it('handles undefined message', () => {
      expect(sanitizeMessage(undefined)).toBe('');
    });

    it('handles empty message', () => {
      expect(sanitizeMessage('')).toBe('');
    });

    it('leaves message without spaces unchanged', () => {
      expect(sanitizeMessage('NoSpaces')).toBe('NoSpaces');
    });
  });

  describe('DeeplinkValidator', () => {
    let validator: DeeplinkValidator;

    beforeEach(() => {
      validator = new DeeplinkValidator('TestAction');
    });

    describe('requireParams', () => {
      it('validates required params successfully', () => {
        const params: DeeplinkUrlParams = createDefaultParams({
          pubkey: 'test-pubkey',
          channelId: 'test-channel',
        });

        validator.requireParams(params, ['pubkey', 'channelId']);

        expect(validator.isValid).toBe(true);
        expect(validator.validationErrors).toEqual([]);
      });

      it('accumulates errors for missing params', () => {
        const params: DeeplinkUrlParams = createDefaultParams();

        validator.requireParams(params, ['pubkey', 'channelId']);

        expect(validator.isValid).toBe(false);
        expect(validator.validationErrors).toEqual([
          'Missing required parameter: pubkey',
          'Missing required parameter: channelId',
        ]);
      });
    });

    describe('requireValidAddress', () => {
      it('validates correct address', () => {
        validator.requireValidAddress(
          '0x742d35Cc6634C0532925a3b844Bc9e7595f6E123',
        );

        expect(validator.isValid).toBe(true);
        expect(validator.validationErrors).toEqual([]);
      });

      it('adds error for invalid address', () => {
        validator.requireValidAddress('invalid', 'recipient');

        expect(validator.isValid).toBe(false);
        expect(validator.validationErrors).toEqual([
          'Invalid Ethereum address for recipient',
        ]);
      });
    });

    describe('requireValidUrl', () => {
      it('validates correct URL', () => {
        validator.requireValidUrl('https://example.com');

        expect(validator.isValid).toBe(true);
        expect(validator.validationErrors).toEqual([]);
      });

      it('adds error for invalid URL', () => {
        validator.requireValidUrl('not-a-url', 'callback');

        expect(validator.isValid).toBe(false);
        expect(validator.validationErrors).toEqual([
          'Invalid URL for callback',
        ]);
      });
    });

    describe('requireValidAccount', () => {
      it('validates correct account', () => {
        validator.requireValidAccount(
          '0x742d35Cc6634C0532925a3b844Bc9e7595f6E123@1',
        );

        expect(validator.isValid).toBe(true);
        expect(validator.validationErrors).toEqual([]);
      });

      it('adds errors for invalid account', () => {
        validator.requireValidAccount('invalid@0');

        expect(validator.isValid).toBe(false);
        expect(validator.validationErrors).toEqual([
          'Invalid Ethereum address',
          'Invalid chain ID',
        ]);
      });
    });

    describe('validate', () => {
      it('does nothing when validation passes', () => {
        validator.requireValidAddress(
          '0x742d35Cc6634C0532925a3b844Bc9e7595f6E123',
        );

        expect(() => validator.validate()).not.toThrow();
        expect(DevLogger.log).not.toHaveBeenCalled();
      });

      it('throws error when validation fails', () => {
        validator.requireValidAddress('invalid');
        validator.requireValidUrl('not-a-url');

        expect(() => validator.validate()).toThrow(
          'TestAction: Validation failed - Invalid Ethereum address for address, Invalid URL for url',
        );

        expect(DevLogger.log).toHaveBeenCalledWith(
          'TestAction: Validation failed - Invalid Ethereum address for address, Invalid URL for url',
        );
      });
    });

    describe('chaining', () => {
      it('supports method chaining', () => {
        const params: DeeplinkUrlParams = createDefaultParams({
          pubkey: 'test',
        });

        const result = validator
          .requireParams(params, ['pubkey'])
          .requireValidAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f6E123')
          .requireValidUrl('https://example.com')
          .requireValidAccount('0x742d35Cc6634C0532925a3b844Bc9e7595f6E123@1');

        expect(result).toBe(validator);
        expect(validator.isValid).toBe(true);
      });
    });
  });
});
