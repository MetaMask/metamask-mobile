import { truncateAddress } from './truncateAddress';

describe('truncateAddress', () => {
  it('should truncate a standard Ethereum address correctly', () => {
    const address = '0x1234567890abcdef1234567890abcdef12345678';
    const result = truncateAddress(address);
    expect(result).toBe('0x12...5678');
  });

  it('should return undefined when address is undefined', () => {
    const result = truncateAddress(undefined);
    expect(result).toBeUndefined();
  });

  it('should return undefined when address is an empty string', () => {
    const result = truncateAddress('');
    expect(result).toBeUndefined();
  });

  it('should handle short addresses (less than 8 characters)', () => {
    const address = '0x1234';
    const result = truncateAddress(address);
    expect(result).toBe('0x12...1234');
  });

  it('should handle very short addresses', () => {
    const address = '0x12';
    const result = truncateAddress(address);
    expect(result).toBe('0x12...0x12');
  });

  it('should handle addresses with exactly 8 characters', () => {
    const address = '0x123456';
    const result = truncateAddress(address);
    expect(result).toBe('0x12...3456');
  });

  it('should handle longer addresses', () => {
    const address = '0x1234567890abcdef1234567890abcdef1234567890abcdef';
    const result = truncateAddress(address);
    expect(result).toBe('0x12...cdef');
  });

  it('should handle addresses without 0x prefix', () => {
    const address = '1234567890abcdef1234567890abcdef12345678';
    const result = truncateAddress(address);
    expect(result).toBe('1234...5678');
  });
});
