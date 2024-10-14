import { NetworkState, RpcEndpointType } from '@metamask/network-controller';
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
} from '.';
import {
  mockHDKeyringAddress,
  mockQrKeyringAddress,
  mockSimpleKeyringAddress,
} from '../test/keyringControllerTestUtils';

const snapAddress = '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272';

jest.mock('../../core/Engine', () => {
  const { KeyringTypes } = jest.requireActual('@metamask/keyring-controller');
  const { MOCK_KEYRING_CONTROLLER_STATE } = jest.requireActual(
    '../test/keyringControllerTestUtils',
  );
  return {
    context: {
      KeyringController: {
        ...MOCK_KEYRING_CONTROLLER_STATE,
        state: {
          keyrings: [
            ...MOCK_KEYRING_CONTROLLER_STATE.state.keyrings,
            {
              accounts: [snapAddress],
              index: 0,
              type: KeyringTypes.snap,
            },
          ],
        },
      },
    },
  };
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
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should return accounts.qr_hardware if account is a QR keyring', () => {
    expect(getLabelTextByAddress(mockQrKeyringAddress)).toBe(
      'accounts.qr_hardware',
    );
  });

  it('should return KeyringTypes.simple if address is a imported account', () => {
    expect(getLabelTextByAddress(mockSimpleKeyringAddress)).toBe(
      'accounts.imported',
    );
  });

  it('returns "Snaps (beta)" if account is a Snap keyring', () => {
    expect(getLabelTextByAddress(snapAddress)).toBe(
      'accounts.snap_account_tag',
    );
  });

  it('should return null if address is empty', () => {
    expect(getLabelTextByAddress('')).toBe(null);
  });

  it('should return null if account not found', () => {
    expect(
      getLabelTextByAddress('0xD5955C0d639D99699Bfd7Ec54d9FaFEe40e4D278'),
    ).toBe(null);
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
  it('should return QR if address is from a keyring type qr', () => {
    expect(getAddressAccountType(mockQrKeyringAddress)).toBe('QR');
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
