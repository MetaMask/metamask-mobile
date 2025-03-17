import { act } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  personalSignatureConfirmationState,
  securityAlertResponse,
  stakingDepositConfirmationState,
  stakingWithdrawalConfirmationState,
  typedSignV1ConfirmationState,
} from '../../../../util/test/confirm-data-helpers';
import renderWithProvider from '../../../../util/test/renderWithProvider';
// eslint-disable-next-line import/no-namespace
import * as ConfirmationRedesignEnabled from '../hooks/useConfirmationRedesignEnabled';
import { Confirm } from './Confirm';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    addListener: jest.fn(),
    dispatch: jest.fn(),
    goBack: jest.fn(),
    navigate: jest.fn(),
    removeListener: jest.fn(),
    setOptions: jest.fn(),
  }),
}));

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  openURL: jest.fn(),
  canOpenURL: jest.fn(),
  getInitialURL: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { width: 0, height: 0, x: 0, y: 0 };

  return {
    ...jest.requireActual('react-native-safe-area-context'),
    SafeAreaProvider: jest.fn().mockImplementation(({ children }) => children),
    SafeAreaConsumer: jest
      .fn()
      .mockImplementation(({ children }) => children(inset)),
    useSafeAreaInsets: jest.fn().mockImplementation(() => inset),
    useSafeAreaFrame: jest.fn().mockImplementation(() => frame),
  };
});

jest.mock('../../../../core/Engine', () => ({
  getTotalFiatAccountBalance: () => ({ tokenFiat: 10 }),
  context: {
    KeyringController: {
      state: {
        keyrings: [],
      },
      getOrAddQRKeyring: jest.fn(),
    },
    NetworkController: {
      getNetworkConfigurationByNetworkClientId: jest.fn(),
    },
    GasFeeController: {
      startPolling: jest.fn(),
      stopPollingByPollingToken: jest.fn(),
    },
    AccountsController: {
      state: {
        internalAccounts: {
          accounts: {
            '1': {
              address: '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477',
            },
          },
        },
      },
    },
  },
  controllerMessenger: {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
}));

jest.mock('react-native-gzip', () => ({
  deflate: (str: string) => str,
}));

describe('Confirm', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders modal confirmation', async () => {
    const { getByTestId } = renderWithProvider(<Confirm />, {
      state: typedSignV1ConfirmationState,
    });
    expect(getByTestId('modal-confirmation-container')).toBeDefined();
  });

  it('renders a flat confirmation for specified type(s): staking deposit', () => {
    const { getByTestId } = renderWithProvider(<Confirm />, {
      state: stakingDepositConfirmationState,
    });
    expect(getByTestId('flat-confirmation-container')).toBeDefined();
  });

  it('renders a flat confirmation for specified type(s): staking withdrawal', () => {
    const { getByTestId } = renderWithProvider(<Confirm />, {
      state: stakingWithdrawalConfirmationState,
    });
    expect(getByTestId('flat-confirmation-container')).toBeDefined();
  });

  it('renders correct information for personal sign', () => {
    const { getAllByRole, getByText } = renderWithProvider(
      <SafeAreaProvider>
        <Confirm />
      </SafeAreaProvider>,
      {
        state: personalSignatureConfirmationState,
      },
    );
    expect(getByText('Signature request')).toBeDefined();
    expect(
      getByText('Review request details before you confirm.'),
    ).toBeDefined();
    expect(getByText('Request from')).toBeDefined();
    expect(getByText('metamask.github.io')).toBeDefined();
    expect(getByText('Message')).toBeDefined();
    expect(getByText('Example `personal_sign` message')).toBeDefined();
    expect(getAllByRole('button')).toHaveLength(2);
  });

  it('renders correct information for typed sign v1', () => {
    const { getAllByRole, getAllByText, getByText, queryByText } =
      renderWithProvider(
        <SafeAreaProvider>
          <Confirm />
        </SafeAreaProvider>,
        {
          state: typedSignV1ConfirmationState,
        },
      );
    expect(getByText('Signature request')).toBeDefined();
    expect(getByText('Request from')).toBeDefined();
    expect(getByText('metamask.github.io')).toBeDefined();
    expect(getAllByText('Message')).toHaveLength(2);
    expect(getByText('Hi, Alice!')).toBeDefined();
    expect(getAllByRole('button')).toHaveLength(2);
    expect(queryByText('This is a deceptive request')).toBeNull();
  });

  it('renders correct information for staking deposit', async () => {
    const { getByText } = renderWithProvider(<Confirm />, {
      state: stakingDepositConfirmationState,
    });
    expect(getByText('APR')).toBeDefined();
    expect(getByText('Est. annual reward')).toBeDefined();
    expect(getByText('Reward frequency')).toBeDefined();
    expect(getByText('Withdrawal time')).toBeDefined();
    expect(getByText('Network Fee')).toBeDefined();
    expect(getByText('Advanced details')).toBeDefined();
  });

  it('renders correct information for staking withdrawal', async () => {
    const { getByText } = renderWithProvider(<Confirm />, {
      state: stakingWithdrawalConfirmationState,
    });
    expect(getByText('Withdrawal time')).toBeDefined();
    expect(getByText('Unstaking to')).toBeDefined();
    expect(getByText('Interacting with')).toBeDefined();
    expect(getByText('Network')).toBeDefined();
    expect(getByText('Network Fee')).toBeDefined();
  });

  it('renders a blockaid banner if the confirmation has blockaid error response', async () => {
    const { getByText } = renderWithProvider(<Confirm />, {
      state: {
        ...typedSignV1ConfirmationState,
        signatureRequest: { securityAlertResponse },
      },
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(getByText('Signature request')).toBeDefined();
    expect(getByText('This is a deceptive request')).toBeDefined();
  });

  it('returns null if confirmation redesign is not enabled', () => {
    jest
      .spyOn(ConfirmationRedesignEnabled, 'useConfirmationRedesignEnabled')
      .mockReturnValue({ isRedesignedEnabled: false });
    const { queryByText } = renderWithProvider(<Confirm />, {
      state: {
        ...typedSignV1ConfirmationState,
        signatureRequest: { securityAlertResponse },
      },
    });
    expect(queryByText('Signature request')).toBeNull();
  });
});
