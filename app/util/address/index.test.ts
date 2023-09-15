import {
  isENS,
  renderSlightlyLongAddress,
  formatAddress,
  isValidHexAddress,
  isValidAddressInputViaQRCode,
  stripHexPrefix,
  getAddress,
  shouldShowBlockExplorer,
  isQRHardwareAccount,
  getAddressAccountType,
  resemblesAddress,
} from '.';

describe('isENS', () => {
  it('should return false by default', () => {
    expect(isENS()).toBe(false);
  });
  it('should return true for normal domain', () => {
    expect(isENS('ricky.codes')).toBe(true);
  });
  it('should return true for ens', () => {
    expect(isENS('rickycodes.eth')).toBe(true);
  });
  it('should return true for eth ens', () => {
    expect(isENS('ricky.eth.eth')).toBe(true);
  });
  it('should return true for metamask ens', () => {
    expect(isENS('ricky.metamask.eth')).toBe(true);
  });
});

describe('renderSlightlyLongAddress', () => {
  const mockAddress = '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272';
  it('should return the address when the address do not exist', () => {
    expect(renderSlightlyLongAddress(null)).toBeNull();
  });
  it('should return 5 characters before ellipsis and 4 final characters of the address after the ellipsis', () => {
    expect(renderSlightlyLongAddress(mockAddress).split('.')[0].length).toBe(
      24,
    );
    expect(renderSlightlyLongAddress(mockAddress).split('.')[3].length).toBe(4);
  });
  it('should return 0xC4955 before ellipsis and 4D272 after the ellipsis', () => {
    expect(renderSlightlyLongAddress(mockAddress, 5, 2).split('.')[0]).toBe(
      '0xC4955',
    );
    expect(renderSlightlyLongAddress(mockAddress, 5, 0).split('.')[3]).toBe(
      '4D272',
    );
  });
});

describe('formatAddress', () => {
  const mockAddress = '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272';
  it('should return address formatted for short type', () => {
    const expectedValue = '0xC495...D272';
    expect(formatAddress(mockAddress, 'short')).toBe(expectedValue);
  });
  it('should return address formatted for mid type', () => {
    const expectedValue = '0xC4955C0d639D99699Bfd7E...D272';
    expect(formatAddress(mockAddress, 'mid')).toBe(expectedValue);
  });
});

describe('isValidHexAddress', () => {
  it('should return true if all characters are lower case', () => {
    const lowerCaseMockAddress = '0x87187657b35f461d0ceec338d9b8e944a193afe2';
    expect(
      isValidHexAddress(lowerCaseMockAddress, { mixedCaseUseChecksum: true }),
    ).toBe(true);
  });

  it('should return true if all characters are upper case', () => {
    const upperCaseMockAddress = '0x87187657B35F461D0CEEC338D9B8E944A193AFE2';
    expect(
      isValidHexAddress(upperCaseMockAddress, { mixedCaseUseChecksum: true }),
    ).toBe(true);
  });

  it('should return false if the characters are mixed case and the checksum is invalid', () => {
    const upperCaseMockAddress = '0x87187657b35f461d0ceEc338d9B8e944A193afe2';
    expect(
      isValidHexAddress(upperCaseMockAddress, { mixedCaseUseChecksum: true }),
    ).toBe(false);
  });

  it('should return true if the characters are mixed case and the checksum is valid', () => {
    const upperCaseMockAddress = '0x87187657b35F461D0Ceec338d9b8E944a193aFE2';
    expect(
      isValidHexAddress(upperCaseMockAddress, { mixedCaseUseChecksum: true }),
    ).toBe(true);
  });

  it('should return false if the address is an  empty string', () => {
    expect(isValidHexAddress('', { mixedCaseUseChecksum: true })).toBe(false);
  });
});

describe('isValidAddressInputViaQRCode', () => {
  it('should be valid to use the ethereum keyword followed by an address and chain id', () => {
    const mockInput = 'ethereum:0x2990079bcdEe240329a520d2444386FC119da21a@1';
    expect(isValidAddressInputViaQRCode(mockInput)).toBe(true);
  });

  it('should be valid to use the ethereum keyword followed by an address', () => {
    const mockInput = 'ethereum:0x2990079bcdEe240329a520d2444386FC119da21a';
    expect(isValidAddressInputViaQRCode(mockInput)).toBe(true);
  });

  it('should be invalid to use the ethereum keyword followed by an wrong address', () => {
    const mockInput = 'ethereum:0x2990079bcdEe240329a520d2444386FC119d';
    expect(isValidAddressInputViaQRCode(mockInput)).toBe(false);
  });

  it('should be invalid to only have the ethereum keyword', () => {
    const mockInput = 'ethereum:';
    expect(isValidAddressInputViaQRCode(mockInput)).toBe(false);
  });

  it('should be valid to only have the address', () => {
    const mockInput = '0x2990079bcdEe240329a520d2444386FC119da21a';
    expect(isValidAddressInputViaQRCode(mockInput)).toBe(true);
  });

  it('should be invalid to have an URL', () => {
    const mockInput = 'https://www.metamask.io';
    expect(isValidAddressInputViaQRCode(mockInput)).toBe(false);
  });
});

describe('stripHexPrefix', () => {
  const str =
    '0x4cfd3e90fc78b0f86bf7524722150bb8da9c60cd532564d7ff43f5716514f553';
  const stripped =
    '4cfd3e90fc78b0f86bf7524722150bb8da9c60cd532564d7ff43f5716514f553';

  it('returns a string without a hex prefix', () => {
    expect(stripHexPrefix(str)).toBe(stripped);
  });

  it('returns the same string since there is no hex prefix', () => {
    expect(stripHexPrefix(stripped)).toBe(stripped);
  });
});

describe('getAddress', () => {
  const validAddress = '0x87187657B35F461D0CEEC338D9B8E944A193AFE2';
  const inValidAddress = '0x87187657B35F461D0CEEC338D9B8E944A193AFE';
  const validENSAddress = 'test.eth';

  it('should resolve ENS if ENS is valid', async () => {
    const chainId = '1';
    const doENSLookup = jest.fn();
    await doENSLookup(validENSAddress, chainId);
    expect(doENSLookup).toHaveBeenCalledWith(validENSAddress, chainId);
  });

  it('should return address if address is valid', async () => {
    const response = await getAddress(validAddress, '1');
    expect(response).toBe(validAddress);
  });

  it('should return null if address is invalid', async () => {
    const response = await getAddress(inValidAddress, '1');
    expect(response).toBe(null);
  });
});

describe('shouldShowBlockExplorer', () => {
  const networkConfigurations = {
    networkId1: {
      chainId: '1',
      nickname: 'Main Ethereum Network',
      rpcUrl: 'https://mainnet.infura.io/v3/123',
      rpcPrefs: {},
    },
  };

  it('returns true if provider type is not rpc', () => {
    const providerType = 'mainnet';
    const providerRpcTarget = networkConfigurations.networkId1.rpcUrl;

    const result = shouldShowBlockExplorer({
      providerType,
      providerRpcTarget,
      networkConfigurations,
    });

    expect(result).toBe(true);
  });

  it('returns block explorer URL if defined', () => {
    const providerType = 'rpc';
    const providerRpcTarget = networkConfigurations.networkId1.rpcUrl;
    const blockExplorerUrl = 'https://rpc.testnet.fantom.network';
    networkConfigurations.networkId1.rpcPrefs = { blockExplorerUrl };

    const result = shouldShowBlockExplorer({
      providerType,
      providerRpcTarget,
      networkConfigurations,
    });

    expect(result).toBe(blockExplorerUrl);
  });

  it('returns undefined if block explorer URL is not defined', () => {
    const providerType = 'rpc';
    const providerRpcTarget = networkConfigurations.networkId1.rpcUrl;
    networkConfigurations.networkId1.rpcPrefs = {};

    const result = shouldShowBlockExplorer({
      providerType,
      providerRpcTarget,
      networkConfigurations,
    });

    expect(result).toBe(undefined);
  });
});
describe('isQRHardwareAccount', () => {
  it('should return false if argument address is undefined', () => {
    expect(isQRHardwareAccount(undefined as any)).toBeFalsy();
  });
  it('should return false if address does not exist on keyring', () => {
    expect(isQRHardwareAccount('address-stub')).toBeFalsy();
  });

  it('should return false if address is from keyring type simple', () => {
    expect(
      isQRHardwareAccount('0xd018538C87232FF95acbCe4870629b75640a78E7'),
    ).toBeFalsy();
  });
  it('should return false if address is from keyring type hd', () => {
    expect(
      isQRHardwareAccount('0x71C7656EC7ab88b098defB751B7401B5f6d8976F'),
    ).toBeFalsy();
  });
  it('should return true if address is from keyring type qr', () => {
    expect(
      isQRHardwareAccount('0xB374Ca013934e498e5baD3409147F34E6c462389'),
    ).toBeTruthy();
  });
});
describe('getAddressAccountType', () => {
  it('should throw an error if argument address is undefined', () => {
    expect(() => getAddressAccountType(undefined as any)).toThrow(
      'Invalid address: undefined',
    );
  });
  it('should return QR if address is from a keyring type qr', () => {
    expect(
      getAddressAccountType('0xB374Ca013934e498e5baD3409147F34E6c462389'),
    ).toBe('QR');
  });
  it('should return imported if address is from a keyring type simple', () => {
    expect(
      getAddressAccountType('0xd018538C87232FF95acbCe4870629b75640a78E7'),
    ).toBe('Imported');
  });
  it('should return MetaMask if address is not qr or simple', () => {
    expect(
      getAddressAccountType('0x71C7656EC7ab88b098defB751B7401B5f6d8976F'),
    ).toBe('MetaMask');
  });
});
describe('resemblesAddress', () => {
  it('should return false if argument address is undefined', () => {
    expect(resemblesAddress(undefined as any)).toBeFalsy();
  });
  it('should return false if address does not resemble an eth address', () => {
    expect(resemblesAddress('address-stub-1')).toBeFalsy();
  });
  it('should return true if address resemble an eth address', () => {
    expect(
      resemblesAddress('0x71C7656EC7ab88b098defB751B7401B5f6d8976F'),
    ).toBeTruthy();
  });
});
