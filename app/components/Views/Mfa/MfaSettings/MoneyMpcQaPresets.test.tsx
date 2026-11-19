import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { recoverPersonalSignature } from '@metamask/eth-sig-util';
import Engine from '../../../../core/Engine';
import { setMpcTwoFactorTokenProvider } from '../../../../core/MpcMoneyKeyring/mpc-money-keyring-builder';
import { useMfa } from '../../../../util/identity/mfa';
import { moneyAccountMigration } from '../../../../lib/Money/mfa/moneyAccountMigration';
import { MfaSettingsSelectorsIDs } from '../Mfa.testIds';
import MoneyMpcQaPresets from './MoneyMpcQaPresets';

const MPC_ADDRESS = '0x05678a8ab506a1dd33acb44e0a9a943a85f39c56';

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      MoneyAccountController: { state: {} },
      KeyringController: { signPersonalMessage: jest.fn() },
    },
  },
}));

jest.mock('../../../../core/MpcMoneyKeyring/mpc-money-keyring-builder', () => ({
  setMpcTwoFactorTokenProvider: jest.fn(),
}));

jest.mock('../../../../util/identity/mfa', () => ({
  useMfa: jest.fn(),
}));

jest.mock('../../../../lib/Money/mfa/moneyAccountMigration', () => ({
  moneyAccountMigration: {
    reset: jest.fn(),
    start: jest.fn(),
    subscribe: jest.fn(() => jest.fn()),
    getLastError: jest.fn(),
  },
}));

jest.mock('../../../UI/Money/hooks/useMoneyMfa', () => ({
  MONEY_MFA_METHODS: ['passkey', 'totp'],
}));

jest.mock('@metamask/eth-sig-util', () => ({
  recoverPersonalSignature: jest.fn(),
}));

const mockEngine = Engine as unknown as {
  context: {
    MoneyAccountController: { state: object };
    KeyringController: { signPersonalMessage: jest.Mock };
  };
};
const mockVerifyOrEnroll = jest.fn();
const mockSetProvider = jest.mocked(setMpcTwoFactorTokenProvider);

const setMoneyAccount = (entropyType: string) => {
  mockEngine.context.MoneyAccountController.state = {
    defaultMoneyAccountId: 'money-1',
    moneyAccounts: {
      'money-1': {
        address: MPC_ADDRESS,
        options: { entropy: { type: entropyType } },
      },
    },
  };
};

const press = async (
  getByText: ReturnType<typeof render>['getByText'],
  label: string,
) => {
  await act(async () => {
    fireEvent.press(getByText(label));
  });
};

describe('MoneyMpcQaPresets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useMfa).mockReturnValue({
      verifyOrEnroll: mockVerifyOrEnroll,
    } as unknown as ReturnType<typeof useMfa>);
    setMoneyAccount('mpc');
    mockEngine.context.KeyringController.signPersonalMessage.mockResolvedValue(
      '0xsignature',
    );
    jest.mocked(recoverPersonalSignature).mockReturnValue(MPC_ADDRESS);
  });

  it('creates the MPC Money account and shows its address', async () => {
    const { getByText, getByTestId } = render(<MoneyMpcQaPresets />);

    await press(getByText, 'Create MPC Money account');

    expect(moneyAccountMigration.reset).toHaveBeenCalled();
    expect(moneyAccountMigration.start).toHaveBeenCalled();
    expect(
      getByTestId(MfaSettingsSelectorsIDs.MONEY_MPC_QA_RESULT),
    ).toHaveTextContent(new RegExp(MPC_ADDRESS, 'u'));
  });

  it('signs a test message with the MPC Money account', async () => {
    const { getByText, getByTestId } = render(<MoneyMpcQaPresets />);

    await press(getByText, 'Sign test message');

    expect(
      mockEngine.context.KeyringController.signPersonalMessage,
    ).toHaveBeenCalledWith({
      from: MPC_ADDRESS,
      data: expect.stringMatching(/^0x/u),
    });
    expect(mockSetProvider).toHaveBeenCalledWith(undefined);
    expect(
      getByTestId(MfaSettingsSelectorsIDs.MONEY_MPC_QA_RESULT),
    ).toHaveTextContent(/Recovers to the account: true/u);
  });

  it('signs with a token from the authenticator app', async () => {
    mockVerifyOrEnroll.mockResolvedValue({
      credentials: [],
      token: { accessToken: '2fa-token' },
    });
    const { getByText } = render(<MoneyMpcQaPresets />);

    await press(getByText, 'Sign with 2FA (authenticator app)');
    const provider = mockSetProvider.mock.calls[0][0];

    expect(await provider?.()).toBe('2fa-token');
    expect(mockVerifyOrEnroll).toHaveBeenCalledWith(
      expect.objectContaining({ methods: ['totp'], verifyWith: ['totp'] }),
    );
    expect(mockSetProvider).toHaveBeenLastCalledWith(undefined);
  });

  it('asks to create the account when the default Money account is not MPC', async () => {
    setMoneyAccount('mnemonic');
    const { getByText, getByTestId } = render(<MoneyMpcQaPresets />);

    await press(getByText, 'Sign test message');

    expect(
      mockEngine.context.KeyringController.signPersonalMessage,
    ).not.toHaveBeenCalled();
    expect(
      getByTestId(MfaSettingsSelectorsIDs.MONEY_MPC_QA_RESULT),
    ).toHaveTextContent(/Error: No MPC Money account, create one first/u);
  });

  it('shows the last migration error', () => {
    jest
      .mocked(moneyAccountMigration.getLastError)
      .mockReturnValue('Error: relayer timeout');

    const { getByTestId } = render(<MoneyMpcQaPresets />);

    expect(
      getByTestId(MfaSettingsSelectorsIDs.MONEY_MPC_QA_LAST_MIGRATION_ERROR),
    ).toHaveTextContent('Last migration error: Error: relayer timeout');
  });
});
