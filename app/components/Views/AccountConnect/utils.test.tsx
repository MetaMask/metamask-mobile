import {
  CaipAccountId,
  CaipChainId,
  KnownCaipNamespace,
} from '@metamask/utils';
import {
  Caip25CaveatType,
  Caip25CaveatValue,
  Caip25EndowmentPermissionName,
} from '@metamask/chain-agnostic-permission';
import {
  getRequestedCaip25CaveatValue,
  getCaip25PermissionsResponse,
  getDefaultAccounts,
  getDefaultSelectedChainIds,
} from './utils';
import { InternalAccountWithCaipAccountId } from '../../../selectors/accountsController';
import { getCaip25Caveat } from '../../../core/Permissions';

jest.mock('../../../core/Permissions', () => ({
  ...jest.requireActual('../../../core/Permissions'),
  getCaip25Caveat: jest.fn(),
}));

const mockGetCaip25Caveat = getCaip25Caveat as jest.Mock;

describe('getRequestedCaip25CaveatValue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockOrigin = 'mock.io';
  const defaultCaveatValue = {
    optionalScopes: {},
    requiredScopes: {},
    isMultichainOrigin: false,
    sessionProperties: {},
  };

  it('should return default value if no param is passed', () => {
    const result = getRequestedCaip25CaveatValue(undefined, mockOrigin);
    expect(result).toEqual(defaultCaveatValue);
  });

  it(`should return default value if param object does not have the key ${Caip25EndowmentPermissionName}`, () => {
    const permissions = {
      anotherPermission: {
        caveats: [
          {
            type: 'anotherType',
            value: {},
          },
        ],
      },
    };
    const result = getRequestedCaip25CaveatValue(permissions, mockOrigin);
    expect(result).toEqual(defaultCaveatValue);
  });

  it(`should return the caveat value whose type is ${Caip25CaveatType}`, () => {
    const expectedCaveatValue: Caip25CaveatValue = {
      optionalScopes: { 'eip155:1': { accounts: ['eip155:1:0x123'] } },
      requiredScopes: {},
      isMultichainOrigin: true,
      sessionProperties: { foo: 'bar' },
    };

    const permissions = {
      [Caip25EndowmentPermissionName]: {
        caveats: [
          {
            type: 'anotherType',
            value: {},
          },
          {
            type: Caip25CaveatType,
            value: expectedCaveatValue,
          },
        ],
      },
    };
    const result = getRequestedCaip25CaveatValue(permissions, mockOrigin);
    expect(result).toEqual(expectedCaveatValue);
  });

  it(`should return default value if no caveat is found with type ${Caip25CaveatType}`, () => {
    const permissions = {
      [Caip25EndowmentPermissionName]: {
        caveats: [
          {
            type: 'anotherType',
            value: {},
          },
        ],
      },
    };
    const result = getRequestedCaip25CaveatValue(permissions, mockOrigin);
    expect(result).toEqual(defaultCaveatValue);
  });

  it('should return default value if caveats is not an array', () => {
    const permissions = {
      [Caip25EndowmentPermissionName]: {
        caveats: [
          {
            type: Caip25CaveatType,
            value: {},
          },
        ],
      },
    };

    const result = getRequestedCaip25CaveatValue(permissions, mockOrigin);
    expect(result).toEqual(defaultCaveatValue);
  });

  describe('object format', () => {
    it(`should return default value if ${Caip25CaveatType} type caveat is not an object`, () => {
      const permissions = {
        [Caip25EndowmentPermissionName]: {
          caveats: [
            {
              type: Caip25CaveatType,
              value: [
                {
                  type: Caip25CaveatType,
                  value: 'notAnObject',
                },
              ],
            },
          ],
        },
      };

      const result = getRequestedCaip25CaveatValue(permissions, mockOrigin);
      expect(result).toEqual(defaultCaveatValue);
    });

    it(`should return default value if ${Caip25CaveatType} type caveat does not have "optionalScopes" property`, () => {
      const permissions = {
        [Caip25EndowmentPermissionName]: {
          caveats: [
            {
              type: Caip25CaveatType,
              value: [
                {
                  type: Caip25CaveatType,
                  value: {
                    requiredScopes: {},
                    isMultichainOrigin: false,
                    sessionProperties: {},
                  },
                },
              ],
            },
          ],
        },
      };

      const result = getRequestedCaip25CaveatValue(permissions, mockOrigin);
      expect(result).toEqual(defaultCaveatValue);
    });

    it(`should return default value if ${Caip25CaveatType} type caveat does not have "requiredScopes" property`, () => {
      const permissions = {
        [Caip25EndowmentPermissionName]: {
          caveats: [
            {
              type: Caip25CaveatType,
              value: [
                {
                  type: Caip25CaveatType,
                  value: {
                    optionalScopes: {},
                    isMultichainOrigin: false,
                    sessionProperties: {},
                  },
                },
              ],
            },
          ],
        },
      };

      const result = getRequestedCaip25CaveatValue(permissions, mockOrigin);
      expect(result).toEqual(defaultCaveatValue);
    });
    it(`should return default value if ${Caip25CaveatType} type caveat does not have "isMultichainOrigin" property`, () => {
      const permissions = {
        [Caip25EndowmentPermissionName]: {
          caveats: [
            {
              type: Caip25CaveatType,
              value: [
                {
                  type: Caip25CaveatType,
                  value: {
                    optionalScopes: {},
                    requiredScopes: {},
                    sessionProperties: {},
                  },
                },
              ],
            },
          ],
        },
      };

      const result = getRequestedCaip25CaveatValue(permissions, mockOrigin);
      expect(result).toEqual(defaultCaveatValue);
    });
    it(`should return default value if ${Caip25CaveatType} type caveat does not have "sessionProperties" property`, () => {
      const permissions = {
        [Caip25EndowmentPermissionName]: {
          caveats: [
            {
              type: Caip25CaveatType,
              value: [
                {
                  type: Caip25CaveatType,
                  value: {
                    optionalScopes: {},
                    isMultichainOrigin: false,
                    requiredScopes: {},
                  },
                },
              ],
            },
          ],
        },
      };

      const result = getRequestedCaip25CaveatValue(permissions, mockOrigin);
      expect(result).toEqual(defaultCaveatValue);
    });
  });

  describe('existing permission', () => {
    it('should return originally requested value if no permission existed previously', () => {
      const expectedCaveatValue: Caip25CaveatValue = {
        optionalScopes: { 'eip155:1': { accounts: ['eip155:1:0x123'] } },
        requiredScopes: {},
        isMultichainOrigin: true,
        sessionProperties: { foo: 'bar' },
      };

      const permissions = {
        [Caip25EndowmentPermissionName]: {
          caveats: [
            {
              type: Caip25CaveatType,
              value: expectedCaveatValue,
            },
          ],
        },
      };
      const result = getRequestedCaip25CaveatValue(permissions, mockOrigin);
      expect(result).toEqual(expectedCaveatValue);
    });

    it('should return merged caip25 value if permission existed previously', () => {
      mockGetCaip25Caveat.mockReturnValue({
        value: {
          optionalScopes: { 'eip155:10': { accounts: ['eip155:10:0x123'] } },
          requiredScopes: {},
          isMultichainOrigin: true,
          sessionProperties: { bar: 'foo' },
        },
      });

      const expectedCaveatValue: Caip25CaveatValue = {
        optionalScopes: { 'eip155:1': { accounts: ['eip155:1:0x123'] } },
        requiredScopes: {},
        isMultichainOrigin: true,
        sessionProperties: { foo: 'bar' },
      };

      const permissions = {
        [Caip25EndowmentPermissionName]: {
          caveats: [
            {
              type: Caip25CaveatType,
              value: expectedCaveatValue,
            },
          ],
        },
      };
      const result = getRequestedCaip25CaveatValue(permissions, mockOrigin);
      expect(result).toEqual({
        optionalScopes: {
          'eip155:1': { accounts: ['eip155:1:0x123'] },
          'eip155:10': { accounts: ['eip155:10:0x123'] },
        },
        requiredScopes: {},
        isMultichainOrigin: true,
        sessionProperties: { foo: 'bar', bar: 'foo' },
      });
    });
  });
});

describe('getCaip25PermissionsResponse', () => {
  it('should add accounts and chainIds to empty caveat value', () => {
    const initialCaveatValue: Caip25CaveatValue = {
      optionalScopes: {},
      requiredScopes: {},
      isMultichainOrigin: false,
      sessionProperties: {},
    };
    const accountIds: CaipAccountId[] = [
      'eip155:0:0x0000000000000000000000000000000000000001',
    ];
    const chainIds: CaipChainId[] = ['eip155:1'];

    const result = getCaip25PermissionsResponse(
      initialCaveatValue,
      accountIds,
      chainIds,
    );

    expect(result).toEqual({
      [Caip25EndowmentPermissionName]: {
        caveats: [
          {
            type: Caip25CaveatType,
            value: {
              optionalScopes: {
                'eip155:1': {
                  accounts: [
                    'eip155:1:0x0000000000000000000000000000000000000001',
                  ],
                },
              },
              requiredScopes: {},
              isMultichainOrigin: false,
              sessionProperties: {},
            },
          },
        ],
      },
    });
  });

  it('should add chainIds with empty accounts array', () => {
    const initialCaveatValue: Caip25CaveatValue = {
      optionalScopes: {},
      requiredScopes: {},
      isMultichainOrigin: false,
      sessionProperties: {},
    };
    const accountIds: CaipAccountId[] = [];
    const chainIds: CaipChainId[] = ['eip155:1'];

    const result = getCaip25PermissionsResponse(
      initialCaveatValue,
      accountIds,
      chainIds,
    );

    expect(result).toEqual({
      [Caip25EndowmentPermissionName]: {
        caveats: [
          {
            type: Caip25CaveatType,
            value: {
              optionalScopes: {
                'eip155:1': {
                  accounts: [],
                },
              },
              requiredScopes: {},
              isMultichainOrigin: false,
              sessionProperties: {},
            },
          },
        ],
      },
    });
  });

  it('should replace existing EVM scopes and accounts', () => {
    const initialCaveatValue: Caip25CaveatValue = {
      optionalScopes: {
        'eip155:1': {
          accounts: ['eip155:1:0x0000000000000000000000000000000000000001'],
        },
      },
      requiredScopes: {},
      isMultichainOrigin: false,
      sessionProperties: {},
    };
    const accountIds: CaipAccountId[] = [
      'eip155:0:0x0000000000000000000000000000000000000002',
    ];
    const chainIds: CaipChainId[] = ['eip155:10'];

    const result = getCaip25PermissionsResponse(
      initialCaveatValue,
      accountIds,
      chainIds,
    );

    expect(result).toEqual({
      [Caip25EndowmentPermissionName]: {
        caveats: [
          {
            type: Caip25CaveatType,
            value: {
              optionalScopes: {
                'eip155:10': {
                  accounts: [
                    'eip155:10:0x0000000000000000000000000000000000000002',
                  ],
                },
              },
              requiredScopes: {},
              isMultichainOrigin: false,
              sessionProperties: {},
            },
          },
        ],
      },
    });
  });
});

describe('getDefaultAccounts', () => {
  const allAccounts: InternalAccountWithCaipAccountId[] = [
    {
      caipAccountId: 'eip155:0:0x123',
      // @ts-expect-error incomplete metadata object
      metadata: {
        lastSelected: 1,
      },
    },
    {
      caipAccountId: 'eip155:0:0x456',
      // @ts-expect-error incomplete metadata object
      metadata: {
        lastSelected: 2,
      },
    },
    {
      caipAccountId: 'eip155:0:0x789',
      // @ts-expect-error incomplete metadata object
      metadata: {
        lastSelected: 3,
      },
    },
    {
      caipAccountId: 'other:0:0xdead',
      // @ts-expect-error incomplete metadata object
      metadata: {
        lastSelected: 1,
      },
    },
    {
      caipAccountId: 'other:0:0xbeef',
      // @ts-expect-error incomplete metadata object
      metadata: {
        lastSelected: 2,
      },
    },
  ];

  it('returns all supported accounts that were requested that match the requested namespace', () => {
    expect(
      getDefaultAccounts(
        ['eip155'],
        [allAccounts[1], allAccounts[2]],
        allAccounts,
      ),
    ).toStrictEqual([allAccounts[1], allAccounts[2]]);
  });

  it('returns most recent account matching requested namespace if no accounts matching that namespace were requested', () => {
    expect(getDefaultAccounts(['eip155'], [], allAccounts)).toStrictEqual([
      allAccounts[2],
    ]);
  });

  it('handles multiple requested namespaces', () => {
    expect(
      getDefaultAccounts(['eip155', 'other'], [], allAccounts),
    ).toStrictEqual([allAccounts[2], allAccounts[4]]);
  });
});

describe('getDefaultSelectedChainIds', () => {
  const mockAllNetworksList: CaipChainId[] = [
    'eip155:1',
    'eip155:10',
    'eip155:137',
    'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('EVM-only requests (EIP-1193, WalletConnect, MMSDK)', () => {
    it('returns all EVM chains for new EVM request without existing permissions', () => {
      // Given an EIP-1193 request without existing permissions
      mockGetCaip25Caveat.mockReturnValue(null);

      // When getting default selected chain IDs
      const result = getDefaultSelectedChainIds({
        isEip1193Request: true,
        allNetworksList: mockAllNetworksList,
        isOriginWalletConnect: false,
        isOriginMMSDKRemoteConn: false,
        supportedRequestedCaipChainIds: [],
        origin: 'test.com',
        requestedNamespaces: [KnownCaipNamespace.Eip155],
      });

      // Then it should return all EVM chains
      expect(result).toEqual(['eip155:1', 'eip155:10', 'eip155:137']);
      expect(mockGetCaip25Caveat).toHaveBeenCalledWith('test.com');
    });

    it('returns requested EVM chains for EVM request with specific chains', () => {
      // Given an EIP-1193 request with specific chains requested
      mockGetCaip25Caveat.mockReturnValue(null);

      // When getting default selected chain IDs with specific chains
      const result = getDefaultSelectedChainIds({
        isEip1193Request: true,
        allNetworksList: mockAllNetworksList,
        isOriginWalletConnect: false,
        isOriginMMSDKRemoteConn: false,
        supportedRequestedCaipChainIds: ['eip155:1'],
        origin: 'test.com',
        requestedNamespaces: [KnownCaipNamespace.Eip155],
      });

      // Then it should return only the requested chains
      expect(result).toEqual(['eip155:1']);
    });

    it('merges EVM chains with existing Solana permissions for EVM request', () => {
      // Given an EIP-1193 request with existing Solana permissions
      const mockExistingCaveat = {
        type: Caip25CaveatType,
        value: {
          optionalScopes: {
            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
              accounts: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:0x456'],
            },
          },
          requiredScopes: {},
          isMultichainOrigin: false,
          sessionProperties: {},
        },
      };

      mockGetCaip25Caveat.mockReturnValue(mockExistingCaveat);

      // When getting default selected chain IDs
      const result = getDefaultSelectedChainIds({
        isEip1193Request: true,
        allNetworksList: mockAllNetworksList,
        isOriginWalletConnect: false,
        isOriginMMSDKRemoteConn: false,
        supportedRequestedCaipChainIds: [],
        origin: 'test.com',
        requestedNamespaces: [KnownCaipNamespace.Eip155],
      });

      // Then it should merge all EVM chains with existing Solana permissions
      expect(result).toEqual(
        expect.arrayContaining([
          'eip155:1',
          'eip155:10',
          'eip155:137',
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        ]),
      );
      expect(mockGetCaip25Caveat).toHaveBeenCalledWith('test.com');
    });

    it('merges requested EVM chains with existing EVM permissions', () => {
      // Given an EIP-1193 request with existing EVM permissions and specific chains requested
      const mockExistingCaveat = {
        type: Caip25CaveatType,
        value: {
          optionalScopes: {
            'eip155:10': { accounts: ['eip155:10:0x123'] },
          },
          requiredScopes: {},
          isMultichainOrigin: false,
          sessionProperties: {},
        },
      };

      mockGetCaip25Caveat.mockReturnValue(mockExistingCaveat);

      // When getting default selected chain IDs with specific chains
      const result = getDefaultSelectedChainIds({
        isEip1193Request: true,
        allNetworksList: mockAllNetworksList,
        isOriginWalletConnect: false,
        isOriginMMSDKRemoteConn: false,
        supportedRequestedCaipChainIds: ['eip155:1'],
        origin: 'test.com',
        requestedNamespaces: [KnownCaipNamespace.Eip155],
      });

      // Then it should merge requested chains with existing permissions
      expect(result).toEqual(expect.arrayContaining(['eip155:1', 'eip155:10']));
      expect(mockGetCaip25Caveat).toHaveBeenCalledWith('test.com');
    });
  });

  describe('Multi-chain requests (non-EVM or mixed)', () => {
    it('returns all EVM chains plus Solana for EIP-1193 multi-chain request with Eip155 namespace but no specific EVM chains', () => {
      // Given an EIP-1193 multi-chain request with Eip155 namespace but no specific EVM chains
      mockGetCaip25Caveat.mockReturnValue(null);

      // When getting default selected chain IDs
      const result = getDefaultSelectedChainIds({
        isEip1193Request: true,
        allNetworksList: mockAllNetworksList,
        isOriginWalletConnect: false,
        isOriginMMSDKRemoteConn: false,
        supportedRequestedCaipChainIds: [
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        ],
        origin: 'test.com',
        requestedNamespaces: [
          KnownCaipNamespace.Solana,
          KnownCaipNamespace.Eip155,
        ],
      });

      // Then it should return all EVM chains plus the requested Solana chain
      expect(result).toEqual(
        expect.arrayContaining([
          'eip155:1',
          'eip155:10',
          'eip155:137',
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        ]),
      );
      expect(result).toHaveLength(4);
    });

    it('returns all available chains for multi-chain request without specific chains', () => {
      // Given a multi-chain request without specific chains
      mockGetCaip25Caveat.mockReturnValue(null);

      // When getting default selected chain IDs
      const result = getDefaultSelectedChainIds({
        isEip1193Request: false,
        allNetworksList: mockAllNetworksList,
        isOriginWalletConnect: false,
        isOriginMMSDKRemoteConn: false,
        supportedRequestedCaipChainIds: [],
        origin: 'test.com',
        requestedNamespaces: [
          KnownCaipNamespace.Eip155,
          KnownCaipNamespace.Solana,
        ],
      });

      // Then it should return chains for all requested namespaces
      expect(result).toEqual(
        expect.arrayContaining([
          'eip155:1',
          'eip155:10',
          'eip155:137',
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        ]),
      );
    });

    it('returns requested chains for multi-chain request with specific chains', () => {
      // Given a multi-chain request with specific chains
      mockGetCaip25Caveat.mockReturnValue(null);

      // When getting default selected chain IDs with specific chains
      const result = getDefaultSelectedChainIds({
        isEip1193Request: false,
        allNetworksList: mockAllNetworksList,
        isOriginWalletConnect: false,
        isOriginMMSDKRemoteConn: false,
        supportedRequestedCaipChainIds: [
          'eip155:1',
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        ],
        origin: 'test.com',
        requestedNamespaces: [
          KnownCaipNamespace.Eip155,
          KnownCaipNamespace.Solana,
        ],
      });

      // Then it should return only the requested chains
      expect(result).toEqual([
        'eip155:1',
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      ]);
    });

    it('merges requested chains with existing permissions for multi-chain request', () => {
      // Given a multi-chain request with existing permissions
      const mockExistingCaveat = {
        type: Caip25CaveatType,
        value: {
          optionalScopes: {
            'eip155:137': { accounts: ['eip155:137:0x123'] },
          },
          requiredScopes: {},
          isMultichainOrigin: false,
          sessionProperties: {},
        },
      };

      mockGetCaip25Caveat.mockReturnValue(mockExistingCaveat);

      // When getting default selected chain IDs with specific chains
      const result = getDefaultSelectedChainIds({
        isEip1193Request: false,
        allNetworksList: mockAllNetworksList,
        isOriginWalletConnect: false,
        isOriginMMSDKRemoteConn: false,
        supportedRequestedCaipChainIds: [
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        ],
        origin: 'test.com',
        requestedNamespaces: [KnownCaipNamespace.Solana],
      });

      // Then it should merge requested chains with existing permissions
      expect(result).toEqual(
        expect.arrayContaining([
          'eip155:137',
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        ]),
      );
      expect(mockGetCaip25Caveat).toHaveBeenCalledWith('test.com');
    });
  });

  describe('Default namespace handling', () => {
    it('returns Solana mainnet for Solana namespace requests', () => {
      // Given a request for Solana namespace without specific chains
      mockGetCaip25Caveat.mockReturnValue(null);

      // When getting default selected chain IDs
      const result = getDefaultSelectedChainIds({
        isEip1193Request: false,
        allNetworksList: mockAllNetworksList,
        isOriginWalletConnect: false,
        isOriginMMSDKRemoteConn: false,
        supportedRequestedCaipChainIds: [],
        origin: 'test.com',
        requestedNamespaces: [KnownCaipNamespace.Solana],
      });

      // Then it should return Solana mainnet
      expect(result).toEqual(['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp']);
    });

    it('returns all available chains when no specific namespaces requested', () => {
      // Given a request without specific namespaces
      mockGetCaip25Caveat.mockReturnValue(null);

      // When getting default selected chain IDs
      const result = getDefaultSelectedChainIds({
        isEip1193Request: false,
        allNetworksList: mockAllNetworksList,
        isOriginWalletConnect: false,
        isOriginMMSDKRemoteConn: false,
        supportedRequestedCaipChainIds: [],
        origin: 'test.com',
        requestedNamespaces: [],
      });

      // Then it should return all available chains
      expect(result).toEqual(mockAllNetworksList);
    });
  });
});

describe('getDefaultSelectedChainIds', () => {
  const mockAllNetworksList: CaipChainId[] = [
    'eip155:1',
    'eip155:10',
    'eip155:137',
    'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('EVM-only requests (EIP-1193, WalletConnect, MMSDK)', () => {
    it('returns all EVM chains for new EVM request without existing permissions', () => {
      // Given an EIP-1193 request without existing permissions
      mockGetCaip25Caveat.mockReturnValue(null);

      // When getting default selected chain IDs
      const result = getDefaultSelectedChainIds({
        isEip1193Request: true,
        allNetworksList: mockAllNetworksList,
        isOriginWalletConnect: false,
        isOriginMMSDKRemoteConn: false,
        supportedRequestedCaipChainIds: [],
        origin: 'test.com',
        requestedNamespaces: [KnownCaipNamespace.Eip155],
      });

      // Then it should return all EVM chains
      expect(result).toEqual(['eip155:1', 'eip155:10', 'eip155:137']);
      expect(mockGetCaip25Caveat).toHaveBeenCalledWith('test.com');
    });

    it('returns requested EVM chains for EVM request with specific chains', () => {
      // Given an EIP-1193 request with specific chains requested
      mockGetCaip25Caveat.mockReturnValue(null);

      // When getting default selected chain IDs with specific chains
      const result = getDefaultSelectedChainIds({
        isEip1193Request: true,
        allNetworksList: mockAllNetworksList,
        isOriginWalletConnect: false,
        isOriginMMSDKRemoteConn: false,
        supportedRequestedCaipChainIds: ['eip155:1'],
        origin: 'test.com',
        requestedNamespaces: [KnownCaipNamespace.Eip155],
      });

      // Then it should return only the requested chains
      expect(result).toEqual(['eip155:1']);
    });

    it('merges EVM chains with existing Solana permissions for EVM request', () => {
      // Given an EIP-1193 request with existing Solana permissions
      const mockExistingCaveat = {
        type: Caip25CaveatType,
        value: {
          optionalScopes: {
            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
              accounts: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:0x456'],
            },
          },
          requiredScopes: {},
          isMultichainOrigin: false,
          sessionProperties: {},
        },
      };

      mockGetCaip25Caveat.mockReturnValue(mockExistingCaveat);

      // When getting default selected chain IDs
      const result = getDefaultSelectedChainIds({
        isEip1193Request: true,
        allNetworksList: mockAllNetworksList,
        isOriginWalletConnect: false,
        isOriginMMSDKRemoteConn: false,
        supportedRequestedCaipChainIds: [],
        origin: 'test.com',
        requestedNamespaces: [KnownCaipNamespace.Eip155],
      });

      // Then it should merge all EVM chains with existing Solana permissions
      expect(result).toEqual(
        expect.arrayContaining([
          'eip155:1',
          'eip155:10',
          'eip155:137',
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        ]),
      );
      expect(mockGetCaip25Caveat).toHaveBeenCalledWith('test.com');
    });

    it('merges requested EVM chains with existing EVM permissions', () => {
      // Given an EIP-1193 request with existing EVM permissions and specific chains requested
      const mockExistingCaveat = {
        type: Caip25CaveatType,
        value: {
          optionalScopes: {
            'eip155:10': { accounts: ['eip155:10:0x123'] },
          },
          requiredScopes: {},
          isMultichainOrigin: false,
          sessionProperties: {},
        },
      };

      mockGetCaip25Caveat.mockReturnValue(mockExistingCaveat);

      // When getting default selected chain IDs with specific chains
      const result = getDefaultSelectedChainIds({
        isEip1193Request: true,
        allNetworksList: mockAllNetworksList,
        isOriginWalletConnect: false,
        isOriginMMSDKRemoteConn: false,
        supportedRequestedCaipChainIds: ['eip155:1'],
        origin: 'test.com',
        requestedNamespaces: [KnownCaipNamespace.Eip155],
      });

      // Then it should merge requested chains with existing permissions
      expect(result).toEqual(expect.arrayContaining(['eip155:1', 'eip155:10']));
      expect(mockGetCaip25Caveat).toHaveBeenCalledWith('test.com');
    });
  });

  describe('Multi-chain requests (non-EVM or mixed)', () => {
    it('returns all EVM chains plus Solana for EIP-1193 multi-chain request with Eip155 namespace but no specific EVM chains', () => {
      // Given an EIP-1193 multi-chain request with Eip155 namespace but no specific EVM chains
      mockGetCaip25Caveat.mockReturnValue(null);

      // When getting default selected chain IDs
      const result = getDefaultSelectedChainIds({
        isEip1193Request: true,
        allNetworksList: mockAllNetworksList,
        isOriginWalletConnect: false,
        isOriginMMSDKRemoteConn: false,
        supportedRequestedCaipChainIds: [
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        ],
        origin: 'test.com',
        requestedNamespaces: [
          KnownCaipNamespace.Solana,
          KnownCaipNamespace.Eip155,
        ],
      });

      // Then it should return all EVM chains plus the requested Solana chain
      expect(result).toEqual(
        expect.arrayContaining([
          'eip155:1',
          'eip155:10',
          'eip155:137',
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        ]),
      );
      expect(result).toHaveLength(4);
    });

    it('returns all available chains for multi-chain request without specific chains', () => {
      // Given a multi-chain request without specific chains
      mockGetCaip25Caveat.mockReturnValue(null);

      // When getting default selected chain IDs
      const result = getDefaultSelectedChainIds({
        isEip1193Request: false,
        allNetworksList: mockAllNetworksList,
        isOriginWalletConnect: false,
        isOriginMMSDKRemoteConn: false,
        supportedRequestedCaipChainIds: [],
        origin: 'test.com',
        requestedNamespaces: [
          KnownCaipNamespace.Eip155,
          KnownCaipNamespace.Solana,
        ],
      });

      // Then it should return chains for all requested namespaces
      expect(result).toEqual(
        expect.arrayContaining([
          'eip155:1',
          'eip155:10',
          'eip155:137',
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        ]),
      );
    });

    it('returns requested chains for multi-chain request with specific chains', () => {
      // Given a multi-chain request with specific chains
      mockGetCaip25Caveat.mockReturnValue(null);

      // When getting default selected chain IDs with specific chains
      const result = getDefaultSelectedChainIds({
        isEip1193Request: false,
        allNetworksList: mockAllNetworksList,
        isOriginWalletConnect: false,
        isOriginMMSDKRemoteConn: false,
        supportedRequestedCaipChainIds: [
          'eip155:1',
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        ],
        origin: 'test.com',
        requestedNamespaces: [
          KnownCaipNamespace.Eip155,
          KnownCaipNamespace.Solana,
        ],
      });

      // Then it should return only the requested chains
      expect(result).toEqual([
        'eip155:1',
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      ]);
    });

    it('merges requested chains with existing permissions for multi-chain request', () => {
      // Given a multi-chain request with existing permissions
      const mockExistingCaveat = {
        type: Caip25CaveatType,
        value: {
          optionalScopes: {
            'eip155:137': { accounts: ['eip155:137:0x123'] },
          },
          requiredScopes: {},
          isMultichainOrigin: false,
          sessionProperties: {},
        },
      };

      mockGetCaip25Caveat.mockReturnValue(mockExistingCaveat);

      // When getting default selected chain IDs with specific chains
      const result = getDefaultSelectedChainIds({
        isEip1193Request: false,
        allNetworksList: mockAllNetworksList,
        isOriginWalletConnect: false,
        isOriginMMSDKRemoteConn: false,
        supportedRequestedCaipChainIds: [
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        ],
        origin: 'test.com',
        requestedNamespaces: [KnownCaipNamespace.Solana],
      });

      // Then it should merge requested chains with existing permissions
      expect(result).toEqual(
        expect.arrayContaining([
          'eip155:137',
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        ]),
      );
      expect(mockGetCaip25Caveat).toHaveBeenCalledWith('test.com');
    });
  });

  describe('Default namespace handling', () => {
    it('returns Solana mainnet for Solana namespace requests', () => {
      // Given a request for Solana namespace without specific chains
      mockGetCaip25Caveat.mockReturnValue(null);

      // When getting default selected chain IDs
      const result = getDefaultSelectedChainIds({
        isEip1193Request: false,
        allNetworksList: mockAllNetworksList,
        isOriginWalletConnect: false,
        isOriginMMSDKRemoteConn: false,
        supportedRequestedCaipChainIds: [],
        origin: 'test.com',
        requestedNamespaces: [KnownCaipNamespace.Solana],
      });

      // Then it should return Solana mainnet
      expect(result).toEqual(['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp']);
    });

    it('returns all available chains when no specific namespaces requested', () => {
      // Given a request without specific namespaces
      mockGetCaip25Caveat.mockReturnValue(null);

      // When getting default selected chain IDs
      const result = getDefaultSelectedChainIds({
        isEip1193Request: false,
        allNetworksList: mockAllNetworksList,
        isOriginWalletConnect: false,
        isOriginMMSDKRemoteConn: false,
        supportedRequestedCaipChainIds: [],
        origin: 'test.com',
        requestedNamespaces: [],
      });

      // Then it should return all available chains
      expect(result).toEqual(mockAllNetworksList);
    });
  });
});
