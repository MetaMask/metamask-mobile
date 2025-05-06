import {
  Caip25CaveatType,
  Caip25EndowmentPermissionName,
} from '@metamask/chain-agnostic-permission';
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
      EthMethod.SignTransaction,
      EthMethod.SignTypedDataV1,
      EthMethod.SignTypedDataV3,
      EthMethod.SignTypedDataV4,
    ],
  };
  describe('caveat specifications', () => {
    it('getCaveatSpecifications returns the expected specifications object', () => {
      const caveatSpecifications = getCaveatSpecifications({});
      expect(Object.keys(caveatSpecifications)).toHaveLength(13);
      expect(caveatSpecifications[Caip25CaveatType].type).toStrictEqual(
        Caip25CaveatType,
      );
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
      expect(caveatSpecifications.protocolSnapScopes.type).toStrictEqual(
        SnapCaveatType.ProtocolSnapScopes,
      );
    });

    describe(`${Caip25CaveatType}`, () => {
      describe('validator', () => {
        it('rejects invalid array values', () => {
          const listAccounts = jest.fn();
          const findNetworkClientIdByChainId = jest.fn();
          const { validator } = getCaveatSpecifications({
            listAccounts,
            findNetworkClientIdByChainId,
          })[Caip25CaveatType];

          [null, 'foo', {}, []].forEach((invalidValue) => {
            expect(() => validator({ value: invalidValue })).toThrow(
              `endowment:caip25 error: Received invalid value for caveat of type "${Caip25CaveatType}".`,
            );
          });
        });

        it('rejects falsy or non-string addresses', () => {
          const listAccounts = jest.fn();
          const findNetworkClientIdByChainId = jest.fn();
          const { validator } = getCaveatSpecifications({
            listAccounts,
            findNetworkClientIdByChainId,
          })[Caip25CaveatType];

          [[{}], [[]], [null], ['']].forEach((invalidValue) => {
            expect(() => validator({ value: invalidValue })).toThrow(
              `endowment:caip25 error: Received invalid value for caveat of type "${Caip25CaveatType}".`,
            );
          });
        });

        it('rejects addresses that have no corresponding identity', () => {
          const findNetworkClientIdByChainId = jest.fn();
          const listAccounts = jest.fn().mockImplementationOnce(() => [
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
            listAccounts,
            findNetworkClientIdByChainId,
          })[Caip25CaveatType];

          expect(() => validator({ value: caveatValues })).toThrow(
            `endowment:caip25 error: Received invalid value for caveat of type "${Caip25CaveatType}".`,
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
        permissionSpecifications[Caip25EndowmentPermissionName].targetName,
      ).toStrictEqual(Caip25EndowmentPermissionName);
    });
  });

  describe('unrestricted methods', () => {
    it('defines the unrestricted methods', () => {
      expect(Array.isArray(unrestrictedMethods)).toBe(true);
      expect(Object.isFrozen(unrestrictedMethods)).toBe(true);
    });
  });
});
