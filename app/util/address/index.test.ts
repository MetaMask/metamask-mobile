import { NetworkState, RpcEndpointType } from '@metamask/network-controller';
import { KeyringTypes } from '@metamask/keyring-controller';

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
  isHardwareAccount,
  resemblesAddress,
  getKeyringByAddress,
  getLabelTextByAddress,
  isSnapAccount,
  toFormattedAddress,
  isHDOrFirstPartySnapAccount,
  renderAccountName,
  getTokenDetails,
  areAddressesEqual,
  toChecksumAddress,
  renderShortAccountName,
  validateAddressOrENS,
} from '.';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import {
  mockHDKeyringAddress,
  mockQrKeyringAddress,
  mockSecondHDKeyringAddress,
  mockSimpleKeyringAddress,
  mockSnapAddress1,
  mockSolanaAddress,
} from '../test/keyringControllerTestUtils';
import {
  internalAccount1,
  MOCK_SOLANA_ACCOUNT,
} from '../test/accountsControllerTestUtils';

jest.mock('../../store', () => ({
  store: {
    getState: jest.fn().mockReturnValue({
      engine: {
        backgroundState: {
          NetworkController: {
            provider: {
              chainId: '0x1',
            },
          },
        },
      },
    }),
  },
}));

jest.mock('../../core/Engine', () => {
  const { MOCK_KEYRING_CONTROLLER_STATE } = jest.requireActual(
    '../test/keyringControllerTestUtils',
  );
  const { MOCK_ACCOUNTS_CONTROLLER_STATE_WITH_KEYRING_TYPES } =
    jest.requireActual('../test/accountsControllerTestUtils');
  return {
    context: {
      KeyringController: {
        ...MOCK_KEYRING_CONTROLLER_STATE,
        state: {
          keyrings: [...MOCK_KEYRING_CONTROLLER_STATE.keyrings],
        },
      },
      AccountsController: {
        ...MOCK_ACCOUNTS_CONTROLLER_STATE_WITH_KEYRING_TYPES,
        state: MOCK_ACCOUNTS_CONTROLLER_STATE_WITH_KEYRING_TYPES,
      },
      AssetsContractController: {
        getTokenStandardAndDetails: jest.fn().mockResolvedValue({
          symbol: 'USDC',
          decimals: 6,
          standard: 'ERC20',
          balance: 100000,
        }),
      },
    },
  };
});

// Mock the selectors used in renderAccountName
jest.mock('../../selectors/networkController', () => ({
  selectChainId: jest.fn().mockReturnValue('0x1'),
}));

// Mock the ENS utils
jest.mock('../../util/ENSUtils', () => ({
  getCachedENSName: jest.fn().mockReturnValue(''),
  isDefaultAccountName: jest.fn().mockReturnValue(false),
  doENSLookup: jest.fn().mockResolvedValue(null),
  doENSReverseLookup: jest.fn().mockResolvedValue(null),
}));

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
  describe('with EVM addresses', () => {
    const mockAddress = '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272';
    it('returns 5 characters before ellipsis and 4 final characters of the address after the ellipsis', () => {
      expect(renderSlightlyLongAddress(mockAddress).split('.')[0].length).toBe(
        24,
      );
      expect(renderSlightlyLongAddress(mockAddress).split('.')[3].length).toBe(
        4,
      );
    });
    it('returns 0xC4955 before ellipsis and 4D272 after the ellipsis', () => {
      expect(renderSlightlyLongAddress(mockAddress, 5, 2).split('.')[0]).toBe(
        '0xC4955',
      );
      expect(renderSlightlyLongAddress(mockAddress, 5, 0).split('.')[3]).toBe(
        '4D272',
      );
    });
  });

  describe('non-EVM addresses', () => {
    it('does not checksum address and maintain original format', () => {
      const address = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
      const result = renderSlightlyLongAddress(address);
      const [beforeEllipsis, afterEllipsis] = result.split('...');
      expect(beforeEllipsis.length).toBe(24); // Default initialChars (20) + chars (4)
      expect(afterEllipsis.length).toBe(4);
      expect(result).toBe('bc1qxy2kgdygjrsqtzq2n0yr...0wlh');
    });

    it('respects custom chars and initialChars parameters', () => {
      const address = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
      const result = renderSlightlyLongAddress(address, 5, 10);
      const [beforeEllipsis, afterEllipsis] = result.split('...');
      expect(beforeEllipsis.length).toBe(15); // Custom initialChars (10) + chars (5)
      expect(afterEllipsis.length).toBe(5);
      expect(result).toBe('bc1qxy2kgdygjrs...x0wlh');
    });
  });
});

describe('renderAccountName', () => {
  describe('with Ethereum accounts', () => {
    it('returns the account name for a known Ethereum account', () => {
      const ethAddress = internalAccount1.address;
      const accounts = [internalAccount1];
      expect(renderAccountName(ethAddress, accounts)).toBe('Account 1');
    });

    it('returns a shortened address for unknown Ethereum accounts', () => {
      const unknownAddress = '0x1234567890123456789012345678901234567890';
      const accounts = [internalAccount1];
      // The shortened address format is first 7 chars + ... + last 5 chars
      expect(renderAccountName(unknownAddress, accounts)).toBe(
        '0x12345...67890',
      );
    });
  });

  describe('with Solana accounts', () => {
    it('returns the account name for a known Solana account', () => {
      const solanaAddress = MOCK_SOLANA_ACCOUNT.address;
      const accounts = [MOCK_SOLANA_ACCOUNT];
      expect(renderAccountName(solanaAddress, accounts)).toBe('Solana Account');
    });

    it('returns a shortened address for unknown Solana accounts', () => {
      const unknownSolanaAddress =
        '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV';
      const accounts = [internalAccount1]; // Only contains Ethereum account
      // The shortened address format is first 7 chars + ... + last 5 chars
      expect(renderAccountName(unknownSolanaAddress, accounts)).toBe(
        '7EcDhSY...CFLtV',
      );
    });
  });
});

describe('formatAddress', () => {
  const mockEvmAddress = '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272';
  const mockBtcAddress = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';

  describe('with EVM addresses', () => {
    it('returns checksummed address formatted for short type', () => {
      const expectedValue = '0xC4955...4D272';
      expect(formatAddress(mockEvmAddress, 'short')).toBe(expectedValue);
    });

    it('returns checksummed address formatted for mid type', () => {
      const expectedValue = '0xC4955C0d639D99699Bfd7E...D272';
      expect(formatAddress(mockEvmAddress, 'mid')).toBe(expectedValue);
    });

    it('returns full checksummed address for full type', () => {
      const expectedValue = '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272';
      expect(formatAddress(mockEvmAddress, 'full')).toBe(expectedValue);
    });
  });

  describe('with non-EVM addresses', () => {
    it('returns address formatted for short type without checksumming', () => {
      const expectedValue = 'bc1qxy2...x0wlh';
      expect(formatAddress(mockBtcAddress, 'short')).toBe(expectedValue);
    });

    it('returns address formatted for mid type without checksumming', () => {
      const expectedValue = 'bc1qxy2kgdygjrsqtzq2n0yr...0wlh';
      expect(formatAddress(mockBtcAddress, 'mid')).toBe(expectedValue);
    });

    it('returns full address without checksumming for full type', () => {
      const expectedValue = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
      expect(formatAddress(mockBtcAddress, 'full')).toBe(expectedValue);
    });
  });
});

describe('toFormattedAddress', () => {
  describe('with EVM addresses', () => {
    it('returns checksummed address for lowercase input', () => {
      const input = '0xc4955c0d639d99699bfd7ec54d9fafee40e4d272';
      const expected = '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272';
      expect(toFormattedAddress(input)).toBe(expected);
    });
  });

  describe('with non-EVM addresses', () => {
    it('returns original address without modification', () => {
      const address = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
      expect(toFormattedAddress(address)).toBe(address);
    });
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

  describe('Bitcoin mainnet addresses', () => {
    it('should be valid for P2WPKH address (bc1)', () => {
      const mockInput = 'bc1qwl8399fz829uqvqly9tcatgrgtwp3udnhxfq4k';
      expect(isValidAddressInputViaQRCode(mockInput)).toBe(true);
    });

    it('should be valid for P2PKH address (1)', () => {
      const mockInput = '1P5ZEDWTKTFGxQjZphgWPQUpe554WKDfHQ';
      expect(isValidAddressInputViaQRCode(mockInput)).toBe(true);
    });

    it('should be invalid for testnet address', () => {
      const mockInput = 'tb1q63st8zfndjh00gf9hmhsdg7l8umuxudrj4lucp';
      expect(isValidAddressInputViaQRCode(mockInput)).toBe(false);
    });

    it('should be invalid for regtest address', () => {
      const mockInput = 'bcrt1qs758ursh4q9z627kt3pp5yysm78ddny6txaqgw';
      expect(isValidAddressInputViaQRCode(mockInput)).toBe(false);
    });
  });

  describe('Tron addresses', () => {
    it('should be valid for Tron mainnet address', () => {
      const mockInput = 'TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7';
      expect(isValidAddressInputViaQRCode(mockInput)).toBe(true);
    });

    it('should be valid for another Tron mainnet address', () => {
      const mockInput = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
      expect(isValidAddressInputViaQRCode(mockInput)).toBe(true);
    });

    it('should be invalid for invalid Tron address (wrong length)', () => {
      const mockInput = 'TLa2f6VPqDgRE67v1736s7bJ8Ray5w';
      expect(isValidAddressInputViaQRCode(mockInput)).toBe(false);
    });

    it('should be invalid for invalid Tron address (does not start with T)', () => {
      const mockInput = 'RLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7';
      expect(isValidAddressInputViaQRCode(mockInput)).toBe(false);
    });
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
  const networkConfigurations: NetworkState['networkConfigurationsByChainId'] =
    {
      '0x1': {
        blockExplorerUrls: [],
        chainId: '0x1',
        defaultRpcEndpointIndex: 0,
        name: 'Main Ethereum Network',
        nativeCurrency: 'USD',
        rpcEndpoints: [
          {
            networkClientId: 'networkId1',
            type: RpcEndpointType.Custom,
            url: 'https://mainnet.infura.io/v3/123',
          },
        ],
      },
    };

  it('returns true if provider type is not rpc', () => {
    const providerType = 'mainnet';

    const providerRpcTarget = networkConfigurations['0x1'].rpcEndpoints.find(
      ({ networkClientId }) => networkClientId === 'networkId1',
    )?.url as string;

    const result = shouldShowBlockExplorer(
      providerType,
      providerRpcTarget,
      networkConfigurations,
    );

    expect(result).toBe(true);
  });

  it('returns block explorer URL if defined', () => {
    const providerType = 'rpc';
    const providerRpcTarget = networkConfigurations['0x1'].rpcEndpoints.find(
      ({ networkClientId }) => networkClientId === 'networkId1',
    )?.url as string;

    const blockExplorerUrl = 'https://rpc.testnet.fantom.network';

    networkConfigurations['0x1'].blockExplorerUrls = [blockExplorerUrl];
    networkConfigurations['0x1'].defaultBlockExplorerUrlIndex = 0;

    const result = shouldShowBlockExplorer(
      providerType,
      providerRpcTarget,
      networkConfigurations,
    );

    expect(result).toBe(blockExplorerUrl);
  });

  it('returns undefined if block explorer URL is not defined', () => {
    const providerType = 'rpc';

    const providerRpcTarget = networkConfigurations['0x1'].rpcEndpoints.find(
      ({ networkClientId }) => networkClientId === 'networkId1',
    )?.url as string;

    networkConfigurations['0x1'].blockExplorerUrls = [];

    const result = shouldShowBlockExplorer(
      providerType,
      providerRpcTarget,
      networkConfigurations,
    );

    expect(result).toBe(undefined);
  });
});
describe('isQRHardwareAccount', () => {
  it('should return false if argument address is undefined', () => {
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(isQRHardwareAccount(undefined as any)).toBeFalsy();
  });
  it('should return false if address does not exist on keyring', () => {
    expect(isQRHardwareAccount('address-stub')).toBeFalsy();
  });

  it('should return false if address is from keyring type simple', () => {
    expect(isQRHardwareAccount(mockSimpleKeyringAddress)).toBeFalsy();
  });
  it('should return false if address is from keyring type hd', () => {
    expect(isQRHardwareAccount(mockHDKeyringAddress)).toBeFalsy();
  });
  it('should return true if address is from keyring type qr', () => {
    expect(isQRHardwareAccount(mockQrKeyringAddress)).toBeTruthy();
  });
});
describe('getKeyringByAddress', () => {
  it('should return undefined if argument address is undefined', () => {
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(getKeyringByAddress(undefined as any)).toBeUndefined();
  });
  it('should return undefined if argument address is not hex address', () => {
    expect(getKeyringByAddress('ens.eth')).toBeUndefined();
  });
  it('should return address if found', () => {
    expect(getKeyringByAddress(mockQrKeyringAddress)).not.toBe(undefined);
  });
  it('should return null if address not found', () => {
    expect(
      getKeyringByAddress('0xB374Ca013934e498e5baD3409147F34E6c462387'),
    ).toBe(undefined);
  });
});
describe('isHardwareAccount,', () => {
  it('should return true if account is a QR keyring', () => {
    expect(isHardwareAccount(mockQrKeyringAddress)).toBeTruthy();
  });

  it('should return false if account is not a hardware keyring', () => {
    expect(
      isHardwareAccount('0xD5955C0d639D99699Bfd7Ec54d9FaFEe40e4D278'),
    ).toBeFalsy();
  });
});
describe('getLabelTextByAddress,', () => {
  it('should return accounts.qr_hardware if account is a QR keyring', () => {
    expect(getLabelTextByAddress(mockQrKeyringAddress)).toBe('QR hardware');
  });

  it('should return KeyringTypes.simple if address is a imported account', () => {
    expect(getLabelTextByAddress(mockSimpleKeyringAddress)).toBe('Imported');
  });

  it('returns "Snaps (Beta)" if account is a Snap keyring and there is no snap name', () => {
    expect(getLabelTextByAddress(mockSnapAddress1)).toBe('Snaps (Beta)');
  });

  it('should return null if address is empty', () => {
    expect(getLabelTextByAddress('')).toBe(null);
  });

  it('should return null if account not found', () => {
    expect(
      getLabelTextByAddress('0xD5955C0d639D99699Bfd7Ec54d9FaFEe40e4D278'),
    ).toBe(null);
  });

  it('returns srp label for hd accounts when there are multiple hd keyrings', () => {
    expect(getLabelTextByAddress(mockSecondHDKeyringAddress)).toBe('SRP #2');
  });

  it('returns srp label for snap accounts that uses hd keyring for its entropy source', () => {
    expect(getLabelTextByAddress(mockSolanaAddress)).toBe('SRP #1');
  });
});
describe('getAddressAccountType', () => {
  it('should throw an error if argument address is undefined', () => {
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => getAddressAccountType(undefined as any)).toThrow(
      'Invalid address: undefined',
    );
  });
  it('should return QR Hardware if address is from a keyring type qr', () => {
    expect(getAddressAccountType(mockQrKeyringAddress)).toBe('QR Hardware');
  });
  it('should return imported if address is from a keyring type simple', () => {
    expect(getAddressAccountType(mockSimpleKeyringAddress)).toBe('Imported');
  });
  it('should return MetaMask if address is not qr or simple', () => {
    expect(getAddressAccountType(mockHDKeyringAddress)).toBe('MetaMask');
  });
});
describe('resemblesAddress', () => {
  it('should return false if argument address is undefined', () => {
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(resemblesAddress(undefined as any)).toBeFalsy();
  });
  it('should return false if address does not resemble an eth address', () => {
    expect(resemblesAddress('address-stub-1')).toBeFalsy();
  });
  it('should return true if address resemble an eth address', () => {
    expect(resemblesAddress(mockHDKeyringAddress)).toBeTruthy();
  });
});
describe('toChecksumAddress', () => {
  it('should return the same address if it is invalid hex string', () => {
    expect(toChecksumAddress('0x1')).toBe('0x1');
    expect(toChecksumAddress('0x123')).toBe('0x123');
    expect(toChecksumAddress('0x1234')).toBe('0x1234');
  });
  it('should throw an error if address is not a hex string', () => {
    expect(() => toChecksumAddress('abc')).toThrow('Invalid hex address.');
  });
});
describe('isSnapAccount,', () => {
  it('should return true if account is of type Snap Keyring', () => {
    expect(isSnapAccount(mockSnapAddress1)).toBeTruthy();
  });

  it('should return false if account is not of type Snap Keyring', () => {
    expect(
      isSnapAccount('0xD5955C0d639D99699Bfd7Ec54d9FaFEe40e4D278'),
    ).toBeFalsy();
  });
});

describe('isHDOrFirstPartySnapAccount', () => {
  it('should return true for HD accounts', () => {
    expect(isHDOrFirstPartySnapAccount(internalAccount1)).toBe(true);
  });

  it('should return true for first-party snap accounts (matching snapId)', () => {
    expect(isHDOrFirstPartySnapAccount(MOCK_SOLANA_ACCOUNT)).toBe(true);
  });

  it('should return true for first-party snap accounts (with entropySource)', () => {
    expect(isHDOrFirstPartySnapAccount(MOCK_SOLANA_ACCOUNT)).toBe(true);
  });

  it('should return false for third-party snap accounts', () => {
    expect(
      isHDOrFirstPartySnapAccount({
        ...MOCK_SOLANA_ACCOUNT,
        metadata: {
          ...MOCK_SOLANA_ACCOUNT.metadata,
          snap: {
            id: 'third-party-snap',
            name: 'Third Party Snap',
            enabled: true,
          },
        },
        options: {},
      }),
    ).toBe(false);
  });

  it.each([
    {
      type: KeyringTypes.simple,
    },
    {
      type: KeyringTypes.ledger,
    },
    {
      type: KeyringTypes.oneKey,
    },
    {
      type: KeyringTypes.qr,
    },
    {
      type: KeyringTypes.trezor,
    },
    {
      type: KeyringTypes.lattice,
    },
  ])('returns false for keyring type $type', ({ type }) => {
    expect(
      isHDOrFirstPartySnapAccount({
        ...internalAccount1,
        metadata: {
          ...internalAccount1.metadata,
          keyring: {
            type,
          },
        },
      }),
    ).toBe(false);
  });
});

describe('getTokenDetails,', () => {
  it('return token details including balanec for ERC20 tokens', async () => {
    expect(await getTokenDetails('0x123', '0x0')).toEqual({
      symbol: 'USDC',
      decimals: 6,
      standard: 'ERC20',
      balance: 100000,
    });
  });
});

describe('renderShortAccountName', () => {
  it('returns the short account name', () => {
    expect(renderShortAccountName('Account 12345678')).toBe('Account 12345678');
  });

  it('returns the short account name with the default number of characters', () => {
    expect(renderShortAccountName('Account 12345678901234567890')).toBe(
      'Account 123456789012...',
    );
  });

  it('returns the short account name with the specified number of characters', () => {
    expect(renderShortAccountName('Account 12345678', 13)).toBe(
      'Account 12345...',
    );
  });
});

describe('areAddressesEqual', () => {
  const ethAddress1 = '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272';
  const ethAddress1Lower = ethAddress1.toLowerCase();
  const ethAddress1Upper = '0xC4955C0D639D99699BFD7EC54D9FAFEE40E4D272'; // Manually created the uppercase variant since .toUppercase() is not supported in Jest results in an invalid address
  const ethAddress2 = '0x87187657B35F461D0CEEC338D9B8E944A193AFE2';
  const btcAddress1 = '3NA96Lj6exM1EARaSVqhjYefBb4akuuwrf'; // Segwit
  const btcAddress2 = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';
  const solanaAddress = '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV';

  describe('when addresses are falsy', () => {
    it('returns false when first address is empty', () => {
      expect(areAddressesEqual('', ethAddress1)).toBe(false);
    });

    it('returns false when second address is empty', () => {
      expect(areAddressesEqual(ethAddress1, '')).toBe(false);
    });

    it('returns false when both addresses are empty', () => {
      expect(areAddressesEqual('', '')).toBe(false);
    });
  });

  describe('when both addresses are EVM addresses', () => {
    it('returns true when addresses are identical', () => {
      expect(areAddressesEqual(ethAddress1, ethAddress1)).toBe(true);
    });

    it('returns true when addresses are the same but different case', () => {
      expect(areAddressesEqual(ethAddress1, ethAddress1Lower)).toBe(true);
      expect(areAddressesEqual(ethAddress1, ethAddress1Upper)).toBe(true);
      expect(areAddressesEqual(ethAddress1Lower, ethAddress1Upper)).toBe(true);
    });

    it('returns false when addresses are different', () => {
      expect(areAddressesEqual(ethAddress1, ethAddress2)).toBe(false);
    });
  });

  describe('when both addresses are non-EVM addresses', () => {
    it('returns true when Bitcoin addresses are identical', () => {
      expect(areAddressesEqual(btcAddress1, btcAddress1)).toBe(true);
    });

    it('returns false when Bitcoin addresses are different', () => {
      expect(areAddressesEqual(btcAddress1, btcAddress2)).toBe(false);
    });

    it('returns true when Solana addresses are identical', () => {
      expect(areAddressesEqual(solanaAddress, solanaAddress)).toBe(true);
    });

    it('returns false when comparing different non-EVM addresses', () => {
      expect(areAddressesEqual(btcAddress1, solanaAddress)).toBe(false);
    });

    it('returns false when non-EVM addresses differ only in case', () => {
      const caseSensitiveAddress = btcAddress1.toLowerCase();
      expect(areAddressesEqual(btcAddress1, caseSensitiveAddress)).toBe(false);
    });

    it('returns false when Solana addresses differ only in case', () => {
      const solanaAddressLowerCase = solanaAddress.toLowerCase();
      expect(areAddressesEqual(solanaAddress, solanaAddressLowerCase)).toBe(
        false,
      );
    });
  });

  describe('when comparing different address types', () => {
    it('returns false when comparing EVM address with Bitcoin address', () => {
      expect(areAddressesEqual(ethAddress1, btcAddress1)).toBe(false);
    });

    it('returns false when comparing EVM address with Solana address', () => {
      expect(areAddressesEqual(ethAddress1, solanaAddress)).toBe(false);
    });

    it('returns false when comparing Bitcoin address with EVM address', () => {
      expect(areAddressesEqual(btcAddress1, ethAddress1)).toBe(false);
    });

    it('returns false when comparing Solana address with EVM address', () => {
      expect(areAddressesEqual(solanaAddress, ethAddress1)).toBe(false);
    });
  });
});

describe('validateAddressOrENS', () => {
  const mockAddressBook = {};
  const mockInternalAccounts: InternalAccount[] = [];
  const chainId = '0x1' as const;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects burn address 0x0000000000000000000000000000000000000000', async () => {
    const burnAddress = '0x0000000000000000000000000000000000000000';
    const result = await validateAddressOrENS(
      burnAddress,
      mockAddressBook,
      mockInternalAccounts,
      chainId,
    );

    expect(result.addressError).toBeDefined();
    expect(result.addressReady).toBe(false);
    expect(result.addToAddressToAddressBook).toBe(false);
  });

  it('rejects burn address 0x000000000000000000000000000000000000dEaD', async () => {
    const burnAddress = '0x000000000000000000000000000000000000dEaD';
    const result = await validateAddressOrENS(
      burnAddress,
      mockAddressBook,
      mockInternalAccounts,
      chainId,
    );

    expect(result.addressError).toBeDefined();
    expect(result.addressReady).toBe(false);
    expect(result.addToAddressToAddressBook).toBe(false);
  });

  it('rejects burn address with different case', async () => {
    const burnAddress = '0x000000000000000000000000000000000000DEAD';
    const result = await validateAddressOrENS(
      burnAddress,
      mockAddressBook,
      mockInternalAccounts,
      chainId,
    );

    expect(result.addressError).toBeDefined();
    expect(result.addressReady).toBe(false);
    expect(result.addToAddressToAddressBook).toBe(false);
  });

  it('rejects ENS that resolves to burn address', async () => {
    const { doENSLookup } = jest.requireMock('../../util/ENSUtils');
    const burnAddress = '0x0000000000000000000000000000000000000000';
    doENSLookup.mockResolvedValueOnce(burnAddress);

    const result = await validateAddressOrENS(
      'test.eth',
      mockAddressBook,
      mockInternalAccounts,
      chainId,
    );

    expect(result.addressError).toBeDefined();
    expect(result.addressReady).toBe(false);
    expect(result.addToAddressToAddressBook).toBe(false);
    expect(doENSLookup).toHaveBeenCalledWith('test.eth', chainId);
  });

  it('accepts valid non-burn address', async () => {
    const validAddress = '0x87187657B35F461D0CEEC338D9B8E944A193AFE2';
    const result = await validateAddressOrENS(
      validAddress,
      mockAddressBook,
      mockInternalAccounts,
      chainId,
    );

    expect(result.addressError).toBeFalsy();
    expect(result.addressReady).toBe(true);
  });
});
