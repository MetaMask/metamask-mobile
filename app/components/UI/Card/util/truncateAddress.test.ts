jest.mock('@metamask/utils', () => ({
  isHexAddress: jest.fn(),
}));

jest.mock('../../../../util/address', () => ({
  safeToChecksumAddress: jest.fn(),
}));

import { isHexAddress } from '@metamask/utils';
import { safeToChecksumAddress } from '../../../../util/address';
import { truncateAddress } from './truncateAddress';

const mockIsHexAddress = isHexAddress as jest.MockedFunction<
  typeof isHexAddress
>;
const mockSafeToChecksumAddress = safeToChecksumAddress as jest.MockedFunction<
  typeof safeToChecksumAddress
>;

describe('truncateAddress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('valid hex addresses', () => {
    it('truncates standard Ethereum address with default chars', () => {
      const address = '0x1234567890abcdef1234567890abcdef12345678';
      const checksummedAddress = '0x1234567890aBcDeF1234567890AbCdEf12345678';
      mockIsHexAddress.mockReturnValue(true);
      mockSafeToChecksumAddress.mockReturnValue(checksummedAddress);

      const result = truncateAddress(address);

      expect(mockIsHexAddress).toHaveBeenCalledWith(address);
      expect(mockSafeToChecksumAddress).toHaveBeenCalledWith(address);
      expect(result).toBe('0x12...5678');
    });

    it('truncates address with custom character count', () => {
      const address = '0x1234567890abcdef1234567890abcdef12345678';
      const checksummedAddress = '0x1234567890aBcDeF1234567890AbCdEf12345678';
      mockIsHexAddress.mockReturnValue(true);
      mockSafeToChecksumAddress.mockReturnValue(checksummedAddress);

      const result = truncateAddress(address, 6);

      expect(result).toBe('0x1234...345678');
    });

    it('truncates short hex address', () => {
      const address = '0x1234';
      mockIsHexAddress.mockReturnValue(true);
      mockSafeToChecksumAddress.mockReturnValue(address);

      const result = truncateAddress(address);

      expect(result).toBe('0x12...1234');
    });

    it('truncates very short hex address', () => {
      const address = '0x12';
      mockIsHexAddress.mockReturnValue(true);
      mockSafeToChecksumAddress.mockReturnValue(address);

      const result = truncateAddress(address);

      expect(result).toBe('0x12...0x12');
    });

    it('preserves checksummed address format', () => {
      const address = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
      const checksummedAddress = '0xAbCdEfAbCdEfAbCdEfAbCdEfAbCdEfAbCdEfAbCd';
      mockIsHexAddress.mockReturnValue(true);
      mockSafeToChecksumAddress.mockReturnValue(checksummedAddress);

      const result = truncateAddress(address);

      expect(result).toBe('0xAb...AbCd');
    });
  });

  describe('non-hex addresses', () => {
    it('truncates non-hex string without checksumming', () => {
      const address = 'some-non-hex-string-1234567890';
      mockIsHexAddress.mockReturnValue(false);

      const result = truncateAddress(address);

      expect(mockIsHexAddress).toHaveBeenCalledWith(address);
      expect(mockSafeToChecksumAddress).not.toHaveBeenCalled();
      expect(result).toBe('some...7890');
    });

    it('truncates alphanumeric string without 0x prefix', () => {
      const address = '1234567890abcdef1234567890abcdef12345678';
      mockIsHexAddress.mockReturnValue(false);

      const result = truncateAddress(address);

      expect(result).toBe('1234...5678');
    });
  });

  describe('edge cases', () => {
    it('returns undefined when address is undefined', () => {
      mockIsHexAddress.mockReturnValue(false);

      const result = truncateAddress(undefined);

      expect(result).toBeUndefined();
    });

    it('returns undefined when address is empty string', () => {
      mockIsHexAddress.mockReturnValue(false);

      const result = truncateAddress('');

      expect(result).toBeUndefined();
    });

    it('returns undefined when checksummed address is undefined', () => {
      const address = '0x1234567890abcdef';
      mockIsHexAddress.mockReturnValue(true);
      mockSafeToChecksumAddress.mockReturnValue(
        undefined as unknown as `0x${string}`,
      );

      const result = truncateAddress(address);

      expect(result).toBeUndefined();
    });

    it('truncates single character address', () => {
      const address = 'x';
      mockIsHexAddress.mockReturnValue(false);

      const result = truncateAddress(address);

      expect(result).toBe('x...x');
    });
  });
});
