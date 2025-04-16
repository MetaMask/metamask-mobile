import { Hex } from '@metamask/utils';
import {
  Caip25CaveatType,
  Caip25CaveatValue,
  Caip25EndowmentPermissionName,
} from '@metamask/chain-agnostic-permission';
import {
  getRequestedCaip25CaveatValue,
  getCaip25PermissionsResponse,
  PermissionsRequest,
} from './utils';

describe('getRequestedCaip25CaveatValue', () => {
  const defaultCaveatValue = {
    optionalScopes: {},
    requiredScopes: {},
    isMultichainOrigin: false,
    sessionProperties: {},
  };

  it('should return default value if no param is passed', () => {
    const result = getRequestedCaip25CaveatValue(undefined);
    expect(result).toEqual(defaultCaveatValue);
  });

  it(`should return default value if param object does not have the key ${Caip25EndowmentPermissionName}`, () => {
    const permissions: PermissionsRequest = {
      anotherPermission: {
        caveats: [
          {
            type: 'anotherType',
            value: defaultCaveatValue,
          },
        ],
      },
    };
    const result = getRequestedCaip25CaveatValue(permissions);
    expect(result).toEqual(defaultCaveatValue);
  });

  it(`should return the caveat value whose type is ${Caip25CaveatType}`, () => {
    const expectedCaveatValue: Caip25CaveatValue = {
      optionalScopes: { 'eip155:1': { accounts: ['eip155:1:0x123'] } },
      requiredScopes: {},
      isMultichainOrigin: true,
      sessionProperties: { foo: 'bar' },
    };

    const permissions: PermissionsRequest = {
      [Caip25EndowmentPermissionName]: {
        caveats: [
          {
            type: 'anotherType',
            value: defaultCaveatValue,
          },
          {
            type: Caip25CaveatType,
            value: expectedCaveatValue,
          },
        ],
      },
    };
    const result = getRequestedCaip25CaveatValue(permissions);
    expect(result).toEqual(expectedCaveatValue);
  });

  it(`should return default value if no caveat is found with type ${Caip25CaveatType}`, () => {
    const permissions: PermissionsRequest = {
      [Caip25EndowmentPermissionName]: {
        caveats: [
          {
            type: 'anotherType',
            value: defaultCaveatValue,
          },
        ],
      },
    };
    const result = getRequestedCaip25CaveatValue(permissions);
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

    const result = getRequestedCaip25CaveatValue(permissions);
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

      const result = getRequestedCaip25CaveatValue(permissions);
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

      const result = getRequestedCaip25CaveatValue(permissions);
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

      const result = getRequestedCaip25CaveatValue(permissions);
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

      const result = getRequestedCaip25CaveatValue(permissions);
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

      const result = getRequestedCaip25CaveatValue(permissions);
      expect(result).toEqual(defaultCaveatValue);
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
    const ethAccountAddresses: Hex[] = [
      '0x0000000000000000000000000000000000000001',
    ];
    const ethChainIds: Hex[] = ['0x1'];

    const result = getCaip25PermissionsResponse(
      initialCaveatValue,
      ethAccountAddresses,
      ethChainIds,
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
    const ethAccountAddresses: Hex[] = [];
    const ethChainIds: Hex[] = ['0x1'];

    const result = getCaip25PermissionsResponse(
      initialCaveatValue,
      ethAccountAddresses,
      ethChainIds,
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

  it('should replace existing scopes and add new ones', () => {
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
    const ethAccountAddresses: Hex[] = [
      '0x0000000000000000000000000000000000000002',
    ];
    const ethChainIds: Hex[] = ['0xa'];

    const result = getCaip25PermissionsResponse(
      initialCaveatValue,
      ethAccountAddresses,
      ethChainIds,
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
