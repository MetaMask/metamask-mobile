import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { recoverPersonalSignature } from '@metamask/eth-sig-util';
import { KeyringAccountEntropyTypeOption } from '@metamask/keyring-api';
import Engine from '../../../../core/Engine';
import { MpcMoneyDeveloperOptionsSection } from './MpcMoneyDeveloperOptionsSection';
import { MpcMoneyDeveloperOptionsSelectorsIDs } from './MpcMoneyDeveloperOptions.testIds';

const MOCK_ADDRESS = '0xABCDEF1234567890ABCDEF1234567890ABCDEF12';

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      MoneyAccountController: {
        createMoneyAccount: jest.fn(),
        state: { moneyAccounts: {} },
      },
      KeyringController: {
        signPersonalMessage: jest.fn(),
      },
    },
  },
}));

jest.mock('../../../../util/theme', () => {
  const actual = jest.requireActual('../../../../util/theme');
  return {
    ...actual,
    useTheme: () => actual.mockTheme,
  };
});

jest.mock('@metamask/eth-sig-util', () => ({
  recoverPersonalSignature: jest.fn(),
}));

const mockedEngine = jest.requireMock('../../../../core/Engine').default as {
  context: {
    MoneyAccountController: {
      createMoneyAccount: jest.Mock;
      state: {
        moneyAccounts: Record<
          string,
          { address: string; options: { entropy: { type: string } } }
        >;
      };
    };
    KeyringController: { signPersonalMessage: jest.Mock };
  };
};

const { createMoneyAccount, signPersonalMessage } = {
  createMoneyAccount:
    mockedEngine.context.MoneyAccountController.createMoneyAccount,
  signPersonalMessage:
    mockedEngine.context.KeyringController.signPersonalMessage,
};

const MNEMONIC_ADDRESS = '0x1234567890ABCDEF1234567890ABCDEF12345678';

const setMpcAccount = (address: string) => {
  mockedEngine.context.MoneyAccountController.state.moneyAccounts = {
    'account-id': {
      address,
      options: { entropy: { type: KeyringAccountEntropyTypeOption.Mpc } },
    },
  };
};

const setMnemonicAccount = (address: string) => {
  const state = mockedEngine.context.MoneyAccountController.state;
  state.moneyAccounts = {
    ...state.moneyAccounts,
    'mnemonic-account-id': {
      address,
      options: { entropy: { type: KeyringAccountEntropyTypeOption.Mnemonic } },
    },
  };
};

const clearAccounts = () => {
  mockedEngine.context.MoneyAccountController.state.moneyAccounts = {};
};

describe('MpcMoneyDeveloperOptionsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearAccounts();
    createMoneyAccount.mockResolvedValue({ address: MOCK_ADDRESS });
    (recoverPersonalSignature as jest.Mock).mockReturnValue(MOCK_ADDRESS);
  });

  it('renders the heading and buttons', () => {
    const { getByText, getByTestId } = render(
      <MpcMoneyDeveloperOptionsSection />,
    );

    expect(getByText('Money MPC (non-production)')).toBeOnTheScreen();
    expect(getByText('Create MPC Money account')).toBeOnTheScreen();
    expect(getByText('Sign test message')).toBeOnTheScreen();
    expect(
      getByTestId(MpcMoneyDeveloperOptionsSelectorsIDs.SECTION),
    ).toBeOnTheScreen();
  });

  it('displays the MPC and mnemonic money account addresses side by side', () => {
    setMpcAccount(MOCK_ADDRESS);
    setMnemonicAccount(MNEMONIC_ADDRESS);

    const { getByTestId } = render(<MpcMoneyDeveloperOptionsSection />);

    expect(
      getByTestId(MpcMoneyDeveloperOptionsSelectorsIDs.MPC_ADDRESS),
    ).toHaveTextContent(`MPC Money account: ${MOCK_ADDRESS}`);
    expect(
      getByTestId(MpcMoneyDeveloperOptionsSelectorsIDs.MNEMONIC_ADDRESS),
    ).toHaveTextContent(`Mnemonic Money account: ${MNEMONIC_ADDRESS}`);
  });

  it('shows placeholders when the money accounts do not exist', () => {
    const { getByTestId } = render(<MpcMoneyDeveloperOptionsSection />);

    expect(
      getByTestId(MpcMoneyDeveloperOptionsSelectorsIDs.MPC_ADDRESS),
    ).toHaveTextContent('MPC Money account: not created');
    expect(
      getByTestId(MpcMoneyDeveloperOptionsSelectorsIDs.MNEMONIC_ADDRESS),
    ).toHaveTextContent('Mnemonic Money account: N/A');
  });

  it('creates the MPC money account when the create button is pressed', async () => {
    const { getByTestId } = render(<MpcMoneyDeveloperOptionsSection />);

    await act(async () => {
      fireEvent.press(
        getByTestId(MpcMoneyDeveloperOptionsSelectorsIDs.CREATE_BUTTON),
      );
    });

    expect(createMoneyAccount).toHaveBeenCalledWith({
      type: KeyringAccountEntropyTypeOption.Mpc,
    });
    expect(
      getByTestId(MpcMoneyDeveloperOptionsSelectorsIDs.RESULT),
    ).toHaveTextContent(/Create MPC Money account: done/u);
  });

  it('signs and verifies a test message when the sign button is pressed', async () => {
    setMpcAccount(MOCK_ADDRESS);
    signPersonalMessage.mockResolvedValue(`0x-signature`);

    const { getByTestId } = render(<MpcMoneyDeveloperOptionsSection />);

    await act(async () => {
      fireEvent.press(
        getByTestId(MpcMoneyDeveloperOptionsSelectorsIDs.SIGN_BUTTON),
      );
    });

    expect(signPersonalMessage).toHaveBeenCalledWith({
      from: MOCK_ADDRESS,
      data: expect.stringMatching(/^0x/u),
    });
    expect(recoverPersonalSignature).toHaveBeenCalled();
    const result = getByTestId(MpcMoneyDeveloperOptionsSelectorsIDs.RESULT);
    expect(result).toHaveTextContent(/Sign test message: done/u);
    expect(result).toHaveTextContent(/Recovers to the account: true/u);
  });

  it('shows an error when signing without an MPC money account', async () => {
    const { getByTestId } = render(<MpcMoneyDeveloperOptionsSection />);

    await act(async () => {
      fireEvent.press(
        getByTestId(MpcMoneyDeveloperOptionsSelectorsIDs.SIGN_BUTTON),
      );
    });

    expect(signPersonalMessage).not.toHaveBeenCalled();
    expect(
      getByTestId(MpcMoneyDeveloperOptionsSelectorsIDs.RESULT),
    ).toHaveTextContent(/Sign test message: failed\./u);
  });
});
