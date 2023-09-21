import Engine from '../../core/Engine';
import {
  isENS,
  renderSlightlyLongAddress,
  formatAddress,
  isHardwareAccount,
  isValidHexAddress,
  isValidAddressInputViaQRCode,
  stripHexPrefix,
  getAddress,
  shouldShowBlockExplorer,
  isQRHardwareAccount,
  getAddressAccountType,
  resemblesAddress,
  renderFullAddress,
  renderShortAddress,
  renderAccountName,
  getTokenDetails,
  importAccountFromPrivateKey,
} from '.';
import { strings } from '../../../locales/i18n';
import { toChecksumAddress } from 'ethereumjs-util';

jest.mock('../../core/Engine', () => ({
  acceptPendingApproval: jest.fn(),
  rejectPendingApproval: jest.fn(),
  context: {
    KeyringController: {
      importAccountWithStrategy: jest.fn(),
      state: {
        keyrings: [
          {
            type: 'Ledger',
            accounts: ['0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272'],
          },
          {
            type: 'QR Hardware Wallet Device',
            accounts: ['0xB374Ca013934e498e5baD3409147F34E6c462389'],
          },
          {
            type: 'Simple Key Pair',
            accounts: ['0xd018538C87232FF95acbCe4870629b75640a78E7'],
          },
          {
            type: 'Metamask',
            accounts: ['0x71C7656EC7ab88b098defB751B7401B5f6d8976F'],
          },
        ],
      },
    },
    AssetsContractController: {
      getTokenStandardAndDetails: jest.fn(),
    },
    PreferencesController: {
      setSelectedAddress: jest.fn(),
    },
  },
}));

describe('renderFullName', () => {
  it('should return error string when the address is empty', () => {
    const expectedResult = strings('transactions.tx_details_not_available');
    expect(renderFullAddress('')).toBe(expectedResult);
  });

  it('should return error string when the address is null', () => {
    const expectedResult = strings('transactions.tx_details_not_available');
    expect(renderFullAddress(null)).toBe(expectedResult);
  });

  it('should return the address when the address is valid', () => {
    const input = '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272';
    const expectedResult = toChecksumAddress(input);
    expect(renderFullAddress(input)).toBe(expectedResult);
  });
});

describe('renderShortAddress', () => {
  const input = '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272';

  it('should return short address format with default 4 characters', () => {
    const expected = '0xC495...D272';
    expect(renderShortAddress(input)).toBe(expected);
  });

  it('should return short address format with specified number of characters', () => {
    const expected = '0xC4955C...e4D272';
    expect(renderShortAddress(input, 6)).toBe(expected);
  });

  it('should return null if it is null', () => {
    expect(renderShortAddress(null)).toBe(null);
  });
});

describe('renderAccountName', () => {
  it('should return account name if it exists in identities', () => {
    const identities = {
      '0x1234567890123456789012345678901234567890': {
        name: 'My Account',
      },
    };
    expect(
      renderAccountName(
        '0x1234567890123456789012345678901234567890',
        identities,
      ),
    ).toBe('My Account');
  });

  it('should return short address format if account name does not exist in identities', () => {
    const identities = {
      '0x1234567890123456789012345678901234567890': {
        name: 'My Account',
      },
    };
    expect(
      renderAccountName(
        '0x0987654321098765432109876543210987654321',
        identities,
      ),
    ).toBe('0x0987...4321');
  });
});

describe('importAccountFromPrivateKey', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should import an account from a private key with 66 characters and prefix 0x', async () => {
    const private_key =
      '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const expectedAddress = '0x123456789abcdef0123456789abcdef01234567';
    const setSelectedAddressMock = jest.fn();
    const importAccountWithStrategyMock = jest
      .fn()
      .mockResolvedValue({ importedAccountAddress: expectedAddress });
    Engine.context.KeyringController.importAccountWithStrategy =
      importAccountWithStrategyMock;
    Engine.context.PreferencesController.setSelectedAddress =
      setSelectedAddressMock;
    await importAccountFromPrivateKey(private_key);
    expect(importAccountWithStrategyMock).toHaveBeenCalledWith('privateKey', [
      private_key.substr(2),
    ]);
    expect(setSelectedAddressMock).toHaveBeenCalledWith(
      '0x123456789AbCdef0123456789abCDEF01234567',
    );
  });

  it('should handle private keys with 66 characters and without 0x prefix', async () => {
    const private_key =
      '650123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const expectedAddress = '0x123456789abcdef0123456789abcdef01234567';
    const setSelectedAddressMock = jest.fn();
    const importAccountWithStrategyMock = jest
      .fn()
      .mockResolvedValue({ importedAccountAddress: expectedAddress });
    Engine.context.KeyringController.importAccountWithStrategy =
      importAccountWithStrategyMock;

    Engine.context.PreferencesController.setSelectedAddress =
      setSelectedAddressMock;

    await importAccountFromPrivateKey(private_key);
    expect(importAccountWithStrategyMock).toHaveBeenCalledWith('privateKey', [
      private_key,
    ]);
    expect(setSelectedAddressMock).toHaveBeenCalledWith(
      '0x123456789AbCdef0123456789abCDEF01234567',
    );
  });

  it('should handle private keys with less than 66 characters', async () => {
    const private_key =
      '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abc';
    const expectedAddress = '0x123456789abcdef0123456789abcdef01234567';
    const setSelectedAddressMock = jest.fn();
    const importAccountWithStrategyMock = jest
      .fn()
      .mockResolvedValue({ importedAccountAddress: expectedAddress });
    Engine.context.KeyringController.importAccountWithStrategy =
      importAccountWithStrategyMock;

    Engine.context.PreferencesController.setSelectedAddress =
      setSelectedAddressMock;

    await importAccountFromPrivateKey(private_key);
    expect(importAccountWithStrategyMock).toHaveBeenCalledWith('privateKey', [
      private_key,
    ]);
    expect(setSelectedAddressMock).toHaveBeenCalledWith(
      '0x123456789AbCdef0123456789abCDEF01234567',
    );
  });
});

describe('getTokenDetails', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const tokenAddress = '0x1234567890123456789012345678901234567890';
  const userAddress = '0x0987654321098765432109876543210987654321';
  const tokenId = '123';

  it('should return token details for ERC20 tokens', async () => {
    const returnData = {
      standard: 'ERC20',
      name: 'MyToken',
      symbol: 'MT',
      decimals: 18,
    };

    const expectedData = {
      standard: 'ERC20',
      symbol: 'MT',
      decimals: 18,
    };
    Engine.context.AssetsContractController.getTokenStandardAndDetails.mockResolvedValueOnce(
      returnData,
    );

    const result = await getTokenDetails(tokenAddress, userAddress, tokenId);

    expect(result).toEqual(expectedData);
  });

  it('should return token details for ERC721 tokens', async () => {
    const returnData = {
      standard: 'ERC721',
      name: 'MyToken',
      symbol: 'MT',
      decimals: 18,
    };
    const expectedData = {
      standard: 'ERC721',
      name: 'MyToken',
      symbol: 'MT',
    };
    Engine.context.AssetsContractController.getTokenStandardAndDetails.mockResolvedValueOnce(
      returnData,
    );

    const result = await getTokenDetails(tokenAddress, userAddress, tokenId);

    expect(result).toEqual(expectedData);
  });

  it('should return token details for ERC1155 tokens', async () => {
    const returnData = {
      standard: 'ERC1155',
      name: 'MyToken',
      symbol: 'MT',
      decimals: 18,
    };

    const expectedData = {
      standard: 'ERC1155',
      name: 'MyToken',
      symbol: 'MT',
    };
    Engine.context.AssetsContractController.getTokenStandardAndDetails.mockResolvedValueOnce(
      returnData,
    );

    const result = await getTokenDetails(tokenAddress, userAddress, tokenId);

    expect(result).toEqual(expectedData);
  });
});

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
  it('should return address formatted for full type', () => {
    const expectedValue = '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272';
    expect(formatAddress(mockAddress, '')).toBe(expectedValue);
  });
});

// eslint-disable-next-line jest/no-disabled-tests
xdescribe('isHardwareAccount,', () => {
  const ledgerMockAddress = '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272';
  const qrHardwareMockAddress = '0xB4955C0d639D99699Bfd7Ec54d9FaFEe40e4D275';

  it('should return true if account is a Ledger keyring', () => {
    expect(isHardwareAccount(ledgerMockAddress)).toBe(true);
  });

  it('should return true if account is a QR keyring', () => {
    expect(isHardwareAccount(qrHardwareMockAddress)).toBe(true);
  });

  it('should return false if account is not a hardware keyring', () => {
    expect(
      isHardwareAccount('0xD5955C0d639D99699Bfd7Ec54d9FaFEe40e4D278'),
    ).toBe(false);
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

  it('should return "Ledger" for a Ledger hardware account', () => {
    const address = '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272';
    const accountType = getAddressAccountType(address);
    expect(accountType).toEqual('Ledger');
  });

  it('should throw an error for an address that is not imported', () => {
    const address = '0x1234567890123456789012345678901234567894';
    expect(() => getAddressAccountType(address)).toThrowError(
      'The address: 0x1234567890123456789012345678901234567894 is not imported',
    );
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
