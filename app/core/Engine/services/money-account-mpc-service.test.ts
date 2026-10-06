import type { Hex } from '@metamask/utils';
import ExtendedKeyringTypes from '../../../constants/keyringTypes';
import {
  MoneyAccountMpcService,
  type MoneyAccountMpcMessenger,
} from './money-account-mpc-service';

const MPC_ADDRESS = '0x2222222222222222222222222222222222222222' as Hex;

function createService(
  call: MoneyAccountMpcMessenger['call'],
): MoneyAccountMpcService {
  const messenger = {
    call,
    registerMethodActionHandlers: jest.fn(),
  } as unknown as MoneyAccountMpcMessenger;

  return new MoneyAccountMpcService({ messenger });
}

describe('MoneyAccountMpcService', () => {
  it('creates an MPC keyring and migrates the Money Account', async () => {
    const call = jest.fn(async (action: string) => {
      if (action === 'KeyringController:getState') {
        return { keyrings: [] };
      }
      if (action === 'KeyringController:addNewKeyring') {
        return { id: 'mpc-keyring-id' };
      }
      if (action === 'KeyringController:withKeyring') {
        return [MPC_ADDRESS];
      }
      return undefined;
    });
    const service = createService(call as MoneyAccountMpcMessenger['call']);

    await expect(service.enableMfa()).resolves.toStrictEqual({
      address: MPC_ADDRESS,
    });

    expect(call).toHaveBeenCalledWith(
      'KeyringController:addNewKeyring',
      ExtendedKeyringTypes.mpc,
      { mode: 'create' },
    );
    expect(call).toHaveBeenCalledWith(
      'MoneyAccountController:migrateMoneyAccountAddress',
      MPC_ADDRESS,
    );
  });

  it('reuses an existing MPC account', async () => {
    const call = jest.fn(async (action: string) => {
      if (action === 'KeyringController:getState') {
        return {
          keyrings: [
            {
              type: ExtendedKeyringTypes.mpc,
              accounts: [MPC_ADDRESS],
            },
          ],
        };
      }
      return undefined;
    });
    const service = createService(call as MoneyAccountMpcMessenger['call']);

    await expect(service.enableMfa()).resolves.toStrictEqual({
      address: MPC_ADDRESS,
    });
    expect(call).not.toHaveBeenCalledWith(
      'KeyringController:addNewKeyring',
      expect.anything(),
      expect.anything(),
    );
  });
});
