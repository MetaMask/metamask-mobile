import { CaveatTypes, RestrictedMethods } from './constants';
import {
  getCaveatSpecifications,
  getPermissionSpecifications,
  unrestrictedMethods,
} from './specifications';
import { EthAccountType, EthMethod } from '@metamask/keyring-api';
import { SnapCaveatType } from '@metamask/snaps-utils';

describe('PermissionController specifications', () => {
  const baseEoaAccount = {
    type: EthAccountType.Eoa,
    options: {},
    methods: [
      EthMethod.PersonalSign,
      EthMethod.Sign,
      EthMethod.SignTransaction,
      EthMethod.SignTypedDataV1,
      EthMethod.SignTypedDataV3,
      EthMethod.SignTypedDataV4,
    ],
  };
  describe('caveat specifications', () => {
    it('getCaveatSpecifications returns the expected specifications object', () => {
      const caveatSpecifications = getCaveatSpecifications({});
      expect(Object.keys(caveatSpecifications)).toHaveLength(12);
      expect(
        caveatSpecifications[CaveatTypes.restrictReturnedAccounts].type,
      ).toStrictEqual(CaveatTypes.restrictReturnedAccounts);
      expect(caveatSpecifications.permittedDerivationPaths.type).toStrictEqual(
        SnapCaveatType.PermittedDerivationPaths,
      );
      expect(caveatSpecifications.permittedCoinTypes.type).toStrictEqual(
        SnapCaveatType.PermittedCoinTypes,
      );
      expect(caveatSpecifications.chainIds.type).toStrictEqual(
        SnapCaveatType.ChainIds,
      );
      expect(caveatSpecifications.snapCronjob.type).toStrictEqual(
        SnapCaveatType.SnapCronjob,
      );
      expect(caveatSpecifications.transactionOrigin.type).toStrictEqual(
        SnapCaveatType.TransactionOrigin,
      );
      expect(caveatSpecifications.signatureOrigin.type).toStrictEqual(
        SnapCaveatType.SignatureOrigin,
      );
      expect(caveatSpecifications.rpcOrigin.type).toStrictEqual(
        SnapCaveatType.RpcOrigin,
      );
      expect(caveatSpecifications.snapIds.type).toStrictEqual(
        SnapCaveatType.SnapIds,
      );
      expect(caveatSpecifications.keyringOrigin.type).toStrictEqual(
        SnapCaveatType.KeyringOrigin,
      );
      expect(caveatSpecifications.maxRequestTime.type).toStrictEqual(
        SnapCaveatType.MaxRequestTime,
      );
      expect(caveatSpecifications.lookupMatchers.type).toStrictEqual(
        SnapCaveatType.LookupMatchers,
      );
    });

    describe('restrictReturnedAccounts', () => {
      describe('decorator', () => {
        it('returns array members included in the caveat value', async () => {
          const getIdentities = jest.fn();
          const caveatValues = ['0x1', '0x2', '0x3'];
          const { decorator } = getCaveatSpecifications({ getIdentities })[
            CaveatTypes.restrictReturnedAccounts
          ];

          const method = async () => ['0x1', '0x2', '0x4'];
          const caveat = {
            type: CaveatTypes.restrictReturnedAccounts,
            value: caveatValues,
          };
          const decorated = decorator(method, caveat);

          expect(await decorated()).toStrictEqual([
            caveatValues[0],
            caveatValues[1],
          ]);
        });

        it('returns an empty array if no array members are included in the caveat value', async () => {
          const getIdentities = jest.fn();
          const caveatValues = ['0x5'];
          const { decorator } = getCaveatSpecifications({ getIdentities })[
            CaveatTypes.restrictReturnedAccounts
          ];

          const method = async () => ['0x1', '0x2', '0x3'];
          const caveat = {
            type: CaveatTypes.restrictReturnedAccounts,
            value: caveatValues,
          };
          const decorated = decorator(method, caveat);
          expect(await decorated()).toStrictEqual([]);
        });

        it('returns an empty array if the method result is an empty array', async () => {
          const getIdentities = jest.fn();
          const caveatValues = ['0x1', '0x2'];
          const { decorator } = getCaveatSpecifications({ getIdentities })[
            CaveatTypes.restrictReturnedAccounts
          ];

          const method = async () => [];
          const caveat = {
            type: CaveatTypes.restrictReturnedAccounts,
            value: caveatValues,
          };
          const decorated = decorator(method, caveat);
          expect(await decorated()).toStrictEqual([]);
        });
      });

      describe('validator', () => {
        it('rejects invalid array values', () => {
          const getIdentities = jest.fn();
          const { validator } = getCaveatSpecifications({ getIdentities })[
            CaveatTypes.restrictReturnedAccounts
          ];

          [null, 'foo', {}, []].forEach((invalidValue) => {
            expect(() => validator({ value: invalidValue })).toThrow(
              /Expected non-empty array of Ethereum addresses\.$/u,
            );
          });
        });

        it('rejects falsy or non-string addresses', () => {
          const getInternalAccounts = jest.fn();
          const { validator } = getCaveatSpecifications({
            getInternalAccounts,
          })[CaveatTypes.restrictReturnedAccounts];

          [[{}], [[]], [null], ['']].forEach((invalidValue) => {
            expect(() => validator({ value: invalidValue })).toThrow(
              /Expected an array of objects that contains an Ethereum addresses. Received:/u,
            );
          });
        });

        it('rejects addresses that have no corresponding identity', () => {
          const getInternalAccounts = jest.fn().mockImplementationOnce(() => [
            {
              address: '0x1',
              id: '21066553-d8c8-4cdc-af33-efc921cd3ca9',
              metadata: {
                name: 'Test Account 1',
                lastSelected: 1,
                keyring: {
                  type: 'HD Key Tree',
                },
              },
              ...baseEoaAccount,
            },
            {
              address: '0x3',
              id: 'ff8fda69-d416-4d25-80a2-efb77bc7d4ad',
              metadata: {
                name: 'Test Account 3',
                lastSelected: 3,
                keyring: {
                  type: 'HD Key Tree',
                },
              },
              ...baseEoaAccount,
            },
          ]);
          const caveatValues = ['0x1', '0x2', '0x3'];

          const { validator } = getCaveatSpecifications({
            getInternalAccounts,
          })[CaveatTypes.restrictReturnedAccounts];

          expect(() => validator({ value: caveatValues })).toThrow(
            /Received unrecognized address:/u,
          );
        });
      });
    });
  });

  describe('permission specifications', () => {
    it('getPermissionSpecifications returns the expected specifications object', () => {
      const permissionSpecifications = getPermissionSpecifications({});
      expect(Object.keys(permissionSpecifications)).toHaveLength(1);
      expect(
        permissionSpecifications[RestrictedMethods.eth_accounts].targetName,
      ).toStrictEqual(RestrictedMethods.eth_accounts);
    });

    describe('eth_accounts', () => {
      describe('factory', () => {
        it('constructs a valid eth_accounts permission', () => {
          const getAllAccounts = jest.fn();
          const { factory } = getPermissionSpecifications({
            getAllAccounts,
          })[RestrictedMethods.eth_accounts];

          expect(
            factory(
              { invoker: 'foo.bar', target: 'eth_accounts' },
              { approvedAccounts: ['0x1'] },
            ),
          ).toStrictEqual({
            caveats: [
              {
                type: CaveatTypes.restrictReturnedAccounts,
                value: ['0x1'],
              },
            ],
            date: expect.any(Number),
            id: expect.any(String),
            invoker: 'foo.bar',
            parentCapability: 'eth_accounts',
          });
        });

        it('throws an error if no approvedAccounts are specified', () => {
          const getAllAccounts = jest.fn();
          const { factory } = getPermissionSpecifications({
            getAllAccounts,
          })[RestrictedMethods.eth_accounts];

          expect(() =>
            factory(
              { invoker: 'foo.bar', target: 'eth_accounts' },
              {}, // no approvedAccounts
            ),
          ).toThrow(/No approved accounts specified\.$/u);
        });

        it('throws an error if any caveats are specified directly', () => {
          const getAllAccounts = jest.fn();
          const { factory } = getPermissionSpecifications({
            getAllAccounts,
          })[RestrictedMethods.eth_accounts];

          expect(() =>
            factory(
              {
                caveats: [
                  {
                    type: CaveatTypes.restrictReturnedAccounts,
                    value: ['0x1', '0x2'],
                  },
                ],
                invoker: 'foo.bar',
                target: 'eth_accounts',
              },
              { approvedAccounts: ['0x1'] },
            ),
          ).toThrow(/Received unexpected caveats./u);
        });
      });

      describe('methodImplementation', () => {
        it('returns the exact keyring accounts in lastSelected order', async () => {
          const getInternalAccounts = jest.fn().mockImplementationOnce(() => [
            {
              address: '0x1',
              id: '21066553-d8c8-4cdc-af33-efc921cd3ca9',
              metadata: {
                name: 'Test Account',
                lastSelected: 1,
                keyring: {
                  type: 'HD Key Tree',
                },
              },
              ...baseEoaAccount,
            },
            {
              address: '0x2',
              id: '0bd7348e-bdfe-4f67-875c-de831a583857',
              metadata: {
                name: 'Test Account',
                keyring: {
                  type: 'HD Key Tree',
                },
              },
              ...baseEoaAccount,
            },
            {
              address: '0x3',
              id: 'ff8fda69-d416-4d25-80a2-efb77bc7d4ad',
              metadata: {
                name: 'Test Account',
                keyring: {
                  type: 'HD Key Tree',
                },
                lastSelected: 3,
              },
              ...baseEoaAccount,
            },
            {
              address: '0x4',
              id: '0bd7348e-bdfe-4f67-875c-de831a583857',
              metadata: {
                name: 'Test Account',
                lastSelected: 3,
                keyring: {
                  type: 'HD Key Tree',
                },
              },
              ...baseEoaAccount,
            },
          ]);
          const getAllAccounts = jest
            .fn()
            .mockImplementationOnce(() => ['0x1', '0x2', '0x3', '0x4']);

          const { methodImplementation } = getPermissionSpecifications({
            getAllAccounts,
            getInternalAccounts,
            captureKeyringTypesWithMissingIdentities: jest.fn(),
          })[RestrictedMethods.eth_accounts];

          expect(await methodImplementation()).toStrictEqual([
            '0x3',
            '0x4',
            '0x1',
            '0x2',
          ]);
        });
        it('throws if a keyring account is missing an address (case 1)', async () => {
          const getInternalAccounts = jest.fn().mockImplementationOnce(() => [
            {
              address: '0x2',
              id: '0bd7348e-bdfe-4f67-875c-de831a583857',
              metadata: {
                name: 'Test Account',
                lastSelected: 2,
                keyring: {
                  type: 'HD Key Tree',
                },
              },
              ...baseEoaAccount,
            },
            {
              address: '0x3',
              id: 'ff8fda69-d416-4d25-80a2-efb77bc7d4ad',
              metadata: {
                name: 'Test Account',
                lastSelected: 3,
                keyring: {
                  type: 'HD Key Tree',
                },
              },
              ...baseEoaAccount,
            },
          ]);
          const getAllAccounts = jest
            .fn()
            .mockImplementationOnce(() => ['0x1', '0x2', '0x3']);

          const { methodImplementation } = getPermissionSpecifications({
            getInternalAccounts,
            getAllAccounts,
            captureKeyringTypesWithMissingIdentities: jest.fn(),
          })[RestrictedMethods.eth_accounts];

          await expect(() => methodImplementation()).rejects.toThrow(
            'Missing identity for address: "0x1".',
          );
        });

        it('throws if a keyring account is missing an address (case 2)', async () => {
          const getInternalAccounts = jest.fn().mockImplementationOnce(() => [
            {
              address: '0x1',
              id: 'cf8dace4-9439-4bd4-b3a8-88c821c8fcb3',
              metadata: {
                name: 'Test Account',
                lastSelected: 1,
                keyring: {
                  type: 'HD Key Tree',
                },
              },
              ...baseEoaAccount,
            },
            {
              address: '0x3',
              id: 'ff8fda69-d416-4d25-80a2-efb77bc7d4ad',
              metadata: {
                name: 'Test Account',
                lastSelected: 3,
                keyring: {
                  type: 'HD Key Tree',
                },
              },
              ...baseEoaAccount,
            },
          ]);
          const getAllAccounts = jest
            .fn()
            .mockImplementationOnce(() => ['0x1', '0x2', '0x3']);

          const { methodImplementation } = getPermissionSpecifications({
            getInternalAccounts,
            getAllAccounts,
            captureKeyringTypesWithMissingIdentities: jest.fn(),
          })[RestrictedMethods.eth_accounts];

          await expect(() => methodImplementation()).rejects.toThrow(
            'Missing identity for address: "0x2".',
          );
        });
      });

      describe('validator', () => {
        it('accepts valid permissions', () => {
          const getAllAccounts = jest.fn();
          const { validator } = getPermissionSpecifications({
            getAllAccounts,
          })[RestrictedMethods.eth_accounts];

          expect(() =>
            validator({
              caveats: [
                {
                  type: CaveatTypes.restrictReturnedAccounts,
                  value: ['0x1', '0x2'],
                },
              ],
              date: 1,
              id: expect.any(String),
              invoker: 'foo.bar',
              parentCapability: 'eth_accounts',
            }),
          ).not.toThrow();
        });

        it('rejects invalid caveats', () => {
          const getAllAccounts = jest.fn();
          const { validator } = getPermissionSpecifications({
            getAllAccounts,
          })[RestrictedMethods.eth_accounts];

          [null, [], [1, 2], [{ type: 'foobar' }]].forEach(
            (invalidCaveatsValue) => {
              expect(() =>
                validator({
                  caveats: invalidCaveatsValue,
                  date: 1,
                  id: expect.any(String),
                  invoker: 'foo.bar',
                  parentCapability: 'eth_accounts',
                }),
              ).toThrow(/Invalid caveats./u);
            },
          );
        });
      });
    });
  });

  describe('unrestricted methods', () => {
    it('defines the unrestricted methods', () => {
      expect(Array.isArray(unrestrictedMethods)).toBe(true);
      expect(Object.isFrozen(unrestrictedMethods)).toBe(true);
    });
  });
});
