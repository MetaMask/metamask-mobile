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
  renderFullAddress,
  renderShortAddress,
  renderAccountName,
  getTokenDetails,
  importAccountFromPrivateKey,
  isQRHardwareAccount,
  getAddressAccountType,
} from '.';
import { strings } from '../../../locales/i18n';
import { toChecksumAddress } from 'ethereumjs-util';
import { KeyringTypes } from '@metamask/keyring-controller';

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
            accounts: ['0xB4955C0d639D99699Bfd7Ec54d9FaFEe40e4D275'],
          },
          {
            type: 'Simple Key Pair',
            accounts: ['0x1234567890123456789012345678901234567891'],
          },
          {
            type: 'Metamask',
            accounts: ['0xE9f169ac905A6E5E830D5Fd5097458e12552B1F6'],
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
  it('should return the address when the address is empty', () => {
    const expectedResult = strings('transactions.tx_details_not_available');
    expect(renderFullAddress('')).toBe(expectedResult);
  });

  it('should return the address when ', () => {
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

  it('should return the input address if it is null', () => {
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
  it('should import an account from a private key', async () => {
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
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    ]);
    expect(setSelectedAddressMock).toHaveBeenCalledWith(
      '0x123456789AbCdef0123456789abCDEF01234567',
    );
  });

  it('should handle private keys with 0x prefix', async () => {
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
});

describe('getAddressAccountType', () => {
  it('should return "QR" for a QR hardware account', () => {
    const address = '0xB4955C0d639D99699Bfd7Ec54d9FaFEe40e4D275';
    const accountType = getAddressAccountType(address);
    expect(accountType).toEqual('QR');
  });

  it('should return "Imported" for an imported account', () => {
    const address = '0x1234567890123456789012345678901234567891';
    const accountType = getAddressAccountType(address);
    expect(accountType).toEqual('Imported');
  });

  it('should return "Ledger" for a Ledger hardware account', () => {
    const address = '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272';
    const accountType = getAddressAccountType(address);
    expect(accountType).toEqual('Ledger');
  });

  it('should return "MetaMask" for a MetaMask account', () => {
    const address = '0xE9f169ac905A6E5E830D5Fd5097458e12552B1F6';
    const accountType = getAddressAccountType(address);
    expect(accountType).toEqual('MetaMask');
  });

  it('should throw an error for an address that is not imported', () => {
    const address = '0x1234567890123456789012345678901234567894';
    expect(() => getAddressAccountType(address)).toThrowError(
      'The address: 0x1234567890123456789012345678901234567894 is not imported',
    );
  });
});

describe('isQRHardwareAccount', () => {
  it('should return true if address is a QR hardware account', () => {
    const address = '0x1234567890123456789012345678901234567890';
    const keyrings = [
      {
        type: KeyringTypes.qr,
        accounts: [address],
      },
    ];

    Engine.context.KeyringController.state.keyrings = keyrings;
    expect(isQRHardwareAccount(address)).toBe(true);
  });

  it('should return false if address is not a QR hardware account', () => {
    const address = '0x1234567890123456789012345678901234567890';
    const keyrings = [
      {
        type: KeyringTypes.ledger,
        accounts: [address],
      },
    ];

    Engine.context.KeyringController.state.keyrings = keyrings;
    expect(isQRHardwareAccount(address)).toBe(false);
  });

  it('should return false if address is not in any keyring', () => {
    const address = '0x1234567890123456789012345678901234567890';
    const keyrings = [];

    Engine.context.KeyringController.state.keyrings = keyrings;
    expect(isQRHardwareAccount(address)).toBe(false);
  });
});

describe('getTokenDetails', () => {
  const tokenAddress = '0x1234567890123456789012345678901234567890';
  const userAddress = '0x0987654321098765432109876543210987654321';
  const tokenId = '123';

  it('should return token details for ERC20 tokens', async () => {
    const tokenData = {
      standard: 'ERC20',
      symbol: 'ETH',
      decimals: 18,
    };
    Engine.context.AssetsContractController.getTokenStandardAndDetails.mockResolvedValueOnce(
      tokenData,
    );

    const result = await getTokenDetails(tokenAddress, userAddress, tokenId);

    expect(result).toEqual({
      symbol: 'ETH',
      decimals: 18,
      standard: 'ERC20',
    });
  });

  it('should return token details for ERC721 tokens', async () => {
    const tokenData = {
      standard: 'ERC721',
      name: 'CryptoKitties',
      symbol: 'CK',
    };
    Engine.context.AssetsContractController.getTokenStandardAndDetails.mockResolvedValueOnce(
      tokenData,
    );

    const result = await getTokenDetails(tokenAddress, userAddress, tokenId);

    expect(result).toEqual({
      name: 'CryptoKitties',
      symbol: 'CK',
      standard: 'ERC721',
    });
  });

  it('should return token details for ERC1155 tokens', async () => {
    const tokenData = {
      standard: 'ERC1155',
      name: 'MyToken',
      symbol: 'MT',
    };
    Engine.context.AssetsContractController.getTokenStandardAndDetails.mockResolvedValueOnce(
      tokenData,
    );

    const result = await getTokenDetails(tokenAddress, userAddress, tokenId);

    expect(result).toEqual({
      name: 'MyToken',
      symbol: 'MT',
      standard: 'ERC1155',
    });
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
    const networkId = '1';
    const doENSLookup = jest.fn();
    await doENSLookup(validENSAddress, networkId);
    expect(doENSLookup).toHaveBeenCalledWith(validENSAddress, networkId);
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
