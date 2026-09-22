import { toHex } from '@metamask/controller-utils';
import Engine from '../../core/Engine';
import ExtendedKeyringTypes from '../../constants/keyringTypes';
import { forgetLedger, getDeviceId } from '../../core/Ledger/Ledger';
import { forgetQrDevice, withQrKeyring } from '../../core/QrKeyring/QrKeyring';
import { removeAccountsFromPermissions } from '../../core/Permissions';
import { removeHardwareAccount } from './removeHardwareAccount';

jest.mock('../../core/Engine', () => ({
  context: {
    KeyringController: {
      removeAccount: jest.fn(),
      getAccounts: jest.fn(),
      state: {
        keyrings: [],
      },
    },
    AccountsController: {
      state: {
        internalAccounts: {
          selectedAccount: '',
          accounts: {},
        },
      },
    },
  },
  setSelectedAddress: jest.fn(),
}));

jest.mock('../../core/Permissions', () => ({
  removeAccountsFromPermissions: jest.fn(),
}));

jest.mock('../../core/Ledger/Ledger', () => ({
  forgetLedger: jest.fn(),
  getDeviceId: jest.fn(),
}));

jest.mock('../../core/QrKeyring/QrKeyring', () => ({
  forgetQrDevice: jest.fn(),
  withQrKeyring: jest.fn(),
}));

const mockRemoveAccount = jest.mocked(
  Engine.context.KeyringController.removeAccount,
);
const mockGetAccounts = jest.mocked(
  Engine.context.KeyringController.getAccounts,
);
const mockSetSelectedAddress = jest.mocked(Engine.setSelectedAddress);
const mockRemoveAccountsFromPermissions = jest.mocked(
  removeAccountsFromPermissions,
);
const mockForgetLedger = jest.mocked(forgetLedger);
const mockForgetQrDevice = jest.mocked(forgetQrDevice);
const mockGetDeviceId = jest.mocked(getDeviceId);
const mockWithQrKeyring = jest.mocked(withQrKeyring);

const HARDWARE_ADDRESS = '0xC4966c0D659D99699BFD7EB54D8fafEE40e4a756';
const REMAINING_ADDRESS = '0x1234567890123456789012345678901234567890';

const mockSelectedAccount = (address: string) => {
  Engine.context.AccountsController.state = {
    internalAccounts: {
      selectedAccount: 'selected',
      accounts: {
        selected: { address },
      },
    },
  } as unknown as typeof Engine.context.AccountsController.state;
};

const setKeyrings = (keyrings: { type: string; accounts: string[] }[]) => {
  Engine.context.KeyringController.state = {
    keyrings,
  } as unknown as typeof Engine.context.KeyringController.state;
};

describe('removeHardwareAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAccounts.mockResolvedValue([REMAINING_ADDRESS]);
    mockGetDeviceId.mockResolvedValue('nano-x');
    mockWithQrKeyring.mockImplementation(async (callback) =>
      callback({
        keyring: {
          getName: jest.fn().mockResolvedValue('Keystone'),
        },
      } as never),
    );
  });

  it('clears permissions and removes the account from the keyring', async () => {
    await removeHardwareAccount({
      address: HARDWARE_ADDRESS,
      keyringType: ExtendedKeyringTypes.ledger,
    });

    expect(mockRemoveAccountsFromPermissions).toHaveBeenCalledWith([
      toHex(HARDWARE_ADDRESS),
    ]);
    expect(mockRemoveAccount).toHaveBeenCalledWith(toHex(HARDWARE_ADDRESS));
  });

  it.each([
    {
      description:
        'reselects the first account when the removed account was selected',
      selectedAddress: HARDWARE_ADDRESS,
      expectedReselect: REMAINING_ADDRESS,
    },
    {
      description: 'does not reselect when the removed account is not selected',
      selectedAddress: REMAINING_ADDRESS,
      expectedReselect: null,
    },
  ])('$description', async ({ selectedAddress, expectedReselect }) => {
    mockSelectedAccount(selectedAddress);

    const result = await removeHardwareAccount({
      address: HARDWARE_ADDRESS,
      keyringType: ExtendedKeyringTypes.ledger,
    });

    if (expectedReselect) {
      expect(mockSetSelectedAddress).toHaveBeenCalledWith(expectedReselect);
      expect(result.didReselectAccount).toBe(true);
    } else {
      expect(mockSetSelectedAddress).not.toHaveBeenCalled();
      expect(result.didReselectAccount).toBe(false);
    }
  });

  it.each([
    {
      name: 'forgets the Ledger device when the ledger keyring is gone after removal',
      keyringType: ExtendedKeyringTypes.ledger,
      keyrings: [],
      expectedForgetLedger: true,
      expectedForgetQr: false,
    },
    {
      name: 'forgets the Ledger device when the ledger keyring is empty after removal',
      keyringType: ExtendedKeyringTypes.ledger,
      keyrings: [{ type: ExtendedKeyringTypes.ledger, accounts: [] }],
      expectedForgetLedger: true,
      expectedForgetQr: false,
    },
    {
      name: 'forgets the QR device when the QR keyring is empty after removal',
      keyringType: ExtendedKeyringTypes.qr,
      keyrings: [{ type: ExtendedKeyringTypes.qr, accounts: [] }],
      expectedForgetLedger: false,
      expectedForgetQr: true,
    },
    {
      name: 'does not forget the hardware device when other accounts remain on the keyring',
      keyringType: ExtendedKeyringTypes.ledger,
      keyrings: [
        {
          type: ExtendedKeyringTypes.ledger,
          accounts: [REMAINING_ADDRESS],
        },
      ],
      expectedForgetLedger: false,
      expectedForgetQr: false,
    },
  ])(
    '$name',
    async ({
      keyringType,
      keyrings,
      expectedForgetLedger,
      expectedForgetQr,
    }) => {
      setKeyrings(keyrings);

      const result = await removeHardwareAccount({
        address: HARDWARE_ADDRESS,
        keyringType,
      });

      if (expectedForgetLedger) {
        expect(mockForgetLedger).toHaveBeenCalledTimes(1);
        expect(result.forgotDevice).toEqual({
          keyringType,
          deviceModel: 'nano-x',
        });
      } else {
        expect(mockForgetLedger).not.toHaveBeenCalled();
      }

      if (expectedForgetQr) {
        expect(mockForgetQrDevice).toHaveBeenCalledTimes(1);
        expect(result.forgotDevice).toEqual({
          keyringType,
          deviceModel: 'Keystone',
        });
      } else {
        expect(mockForgetQrDevice).not.toHaveBeenCalled();
      }
    },
  );
});
