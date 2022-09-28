import { CaveatTypes, RestrictedMethods } from './constants';
import {
  getCaveatSpecifications,
  getPermissionSpecifications,
  unrestrictedMethods,
} from './specifications';

// Note: This causes Date.now() to return the number 1.
jest.useFakeTimers('modern').setSystemTime(1);

describe('PermissionController specifications', () => {
  describe('caveat specifications', () => {
    it('getCaveatSpecifications returns the expected specifications object', () => {
      const caveatSpecifications = getCaveatSpecifications({});
      expect(Object.keys(caveatSpecifications)).toHaveLength(1);
      expect(
        caveatSpecifications[CaveatTypes.restrictReturnedAccounts].type,
      ).toStrictEqual(CaveatTypes.restrictReturnedAccounts);
    });

    describe('restrictReturnedAccounts', () => {
      describe('decorator', () => {
        it('returns the first array member included in the caveat value', async () => {
          const getIdentities = jest.fn();
          const { decorator } = getCaveatSpecifications({ getIdentities })[
            CaveatTypes.restrictReturnedAccounts
          ];

          const method = async () => ['0x1', '0x2', '0x3'];
          const caveat = {
            type: CaveatTypes.restrictReturnedAccounts,
            value: ['0x1', '0x2'],
          };
          const decorated = decorator(method, caveat);
          expect(await decorated()).toStrictEqual(['0x1']);
        });

        it('returns an empty array if no array members are included in the caveat value', async () => {
          const getIdentities = jest.fn();
          const { decorator } = getCaveatSpecifications({ getIdentities })[
            CaveatTypes.restrictReturnedAccounts
          ];

          const method = async () => ['0x1', '0x2', '0x3'];
          const caveat = {
            type: CaveatTypes.restrictReturnedAccounts,
            value: ['0x5'],
          };
          const decorated = decorator(method, caveat);
          expect(await decorated()).toStrictEqual([]);
        });

        it('returns an empty array if the method result is an empty array', async () => {
          const getIdentities = jest.fn();
          const { decorator } = getCaveatSpecifications({ getIdentities })[
            CaveatTypes.restrictReturnedAccounts
          ];

          const method = async () => [];
          const caveat = {
            type: CaveatTypes.restrictReturnedAccounts,
            value: ['0x1', '0x2'],
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
          const getIdentities = jest.fn();
          const { validator } = getCaveatSpecifications({ getIdentities })[
            CaveatTypes.restrictReturnedAccounts
          ];

          [[{}], [[]], [null], ['']].forEach((invalidValue) => {
            expect(() => validator({ value: invalidValue })).toThrow(
              /Expected an array of Ethereum addresses. Received:/u,
            );
          });
        });

        it('rejects addresses that have no corresponding identity', () => {
          const getIdentities = jest.fn().mockImplementationOnce(() => ({
            '0x1': true,
            '0x3': true,
          }));

          const { validator } = getCaveatSpecifications({ getIdentities })[
            CaveatTypes.restrictReturnedAccounts
          ];

          expect(() => validator({ value: ['0x1', '0x2', '0x3'] })).toThrow(
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
        permissionSpecifications[RestrictedMethods.eth_accounts].targetKey,
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
            date: 1,
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
        it('returns the exact keyring accounts', async () => {
          const getAllAccounts = jest
            .fn()
            .mockImplementationOnce(() => ['0x1', '0x2', '0x3', '0x4']);

          const { methodImplementation } = getPermissionSpecifications({
            getAllAccounts,
          })[RestrictedMethods.eth_accounts];

          expect(await methodImplementation()).toStrictEqual([
            '0x1',
            '0x2',
            '0x3',
            '0x4',
          ]);
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
