import { parseCaip10Address, Caip10Address } from './';
import { isValidHexAddress } from '../address';

jest.mock('../address', () => ({
  isValidHexAddress: jest.fn(),
}));

const mockIsValidHexAddress = isValidHexAddress as jest.MockedFunction<
  typeof isValidHexAddress
>;

describe('parseCaip10Address', () => {
  beforeEach(() => {
    // Clear mock implementations before each test to avoid test interference
    mockIsValidHexAddress.mockClear();
  });
  it('parses a valid CAIP-10 address correctly', () => {
    mockIsValidHexAddress.mockReturnValue(true);
    const caip10Address = 'eip155:1:0x1234567890abcdefABCDEF1234567890ABCDEF';
    const expected: Caip10Address = {
      accountId: 'eip155',
      chainId: '1',
      address: '0x1234567890abcdefABCDEF1234567890ABCDEF',
    };
    expect(parseCaip10Address(caip10Address)).toEqual(expected);
  });

  it('throws an error for an address missing parts', () => {
    const caip10Address = 'eip155:0x1234567890abcdefABCDEF1234567890ABCDEF';
    expect(() => parseCaip10Address(caip10Address)).toThrow(
      'Invalid CAIP-10 address format',
    );
  });

  it('throws an error for an address with too many parts', () => {
    const caip10Address = 'eip155:1:0x123:ExtraPart';
    expect(() => parseCaip10Address(caip10Address)).toThrow(
      'Invalid CAIP-10 address format',
    );
  });

  it('throws an error for an empty string', () => {
    const caip10Address = '';
    expect(() => parseCaip10Address(caip10Address)).toThrow(
      'Invalid CAIP-10 address format',
    );
  });

  it('throws an error for an address with spaces', () => {
    const caip10Address = 'eip155: 1:0x1234567890abcdefABCDEF1234567890ABCDEF';
    expect(() => parseCaip10Address(caip10Address)).toThrow(
      'CAIP-10 address format cannot contain spaces',
    );
  });

  it('throws an error for an Ethereum address with invalid', () => {
    mockIsValidHexAddress.mockReturnValue(false);

    const caip10Address =
      'eip155:1:0xGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFASDASFECDAVFSBFV';
    expect(() => parseCaip10Address(caip10Address)).toThrow(
      'Invalid Ethereum address format',
    );
  });

  it('throws an error for an address with additional colons', () => {
    const caip10Address = 'eip155::1:0x1234567890abcdefABCDEF1234567890ABCDEF';
    expect(() => parseCaip10Address(caip10Address)).toThrow(
      'Invalid CAIP-10 address format',
    );
  });

  it('parses a non-standard blockchain namespace correctly', () => {
    mockIsValidHexAddress.mockReturnValue(false);
    const caip10Address = 'cosmos:cosmoshub-4:cosmos1abcdefg';
    expect(() => parseCaip10Address(caip10Address)).toThrow(
      'Only support Ethereum addresses at the moment',
    );
  });
});
