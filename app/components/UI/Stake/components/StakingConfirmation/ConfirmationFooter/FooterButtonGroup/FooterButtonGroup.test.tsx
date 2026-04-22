import { fireEvent, act } from '@testing-library/react-native';
import React from 'react';
import { useAnalytics } from '../../../../../../hooks/useAnalytics/useAnalytics';
import { createMockUseAnalyticsHook } from '../../../../../../../util/test/analyticsMock';
import { strings } from '../../../../../../../../locales/i18n';
import { createMockAccountsControllerState } from '../../../../../../../util/test/accountsControllerTestUtils';
import { backgroundState } from '../../../../../../../util/test/initial-root-state';
import renderWithProvider, {
  DeepPartial,
} from '../../../../../../../util/test/renderWithProvider';
import { MOCK_POOL_STAKING_SDK } from '../../../../__mocks__/stakeMockData';
import FooterButtonGroup from './FooterButtonGroup';
import {
  FooterButtonGroupActions,
  FooterButtonGroupProps,
} from './FooterButtonGroup.types';
import { RootState } from '../../../../../../../reducers';

const MOCK_ADDRESS_1 = '0x0';

const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerState([
  MOCK_ADDRESS_1,
]);

const mockSelectedAccount =
  MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts.accounts[
    MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts.selectedAccount
  ];

const mockInitialState: DeepPartial<RootState> = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      AccountTreeController: {
        accountTree: {
          wallets: {
            'keyring:test-wallet': {
              groups: {
                'keyring:test-wallet/ethereum': {
                  accounts: [mockSelectedAccount.id],
                },
              },
            },
          },
        },
        selectedAccountGroup: 'keyring:test-wallet/ethereum',
      },
    },
  },
};

const mockCanGoBack = jest.fn();
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      canGoBack: mockCanGoBack,
      goBack: mockGoBack,
      navigate: mockNavigate,
    }),
  };
});

jest.mock('../../../../hooks/useStakeContext', () => ({
  useStakeContext: () => MOCK_POOL_STAKING_SDK,
}));

const mockAttemptDepositTransaction = jest.fn();
const mockAttemptUnstakeTransaction = jest.fn();

jest.mock('../../../../hooks/usePoolStakedDeposit', () => ({
  __esModule: true,
  default: () => ({
    attemptDepositTransaction: mockAttemptDepositTransaction,
  }),
}));

jest.mock('../../../../hooks/usePoolStakedUnstake', () => ({
  __esModule: true,
  default: () => ({
    attemptUnstakeTransaction: mockAttemptUnstakeTransaction,
  }),
}));

jest.mock('../../../../hooks/usePooledStakes', () => ({
  __esModule: true,
  default: () => ({
    refreshPooledStakes: jest.fn(),
  }),
}));

const mockTrackEvent = jest.fn();

jest.mock('../../../../../../hooks/useAnalytics/useAnalytics');

jest.mock('../../../../constants/events', () => ({
  EVENT_LOCATIONS: {
    STAKE_CONFIRMATION_VIEW: 'STAKE_CONFIRMATION_VIEW',
    UNSTAKE_CONFIRMATION_VIEW: 'UNSTAKE_CONFIRMATION_VIEW',
  },
  EVENT_PROVIDERS: {
    CONSENSYS: 'CONSENSYS',
  },
}));

describe('FooterButtonGroup', () => {
  let mockAddProperties: jest.Mock;
  let mockBuild: jest.Mock;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress React 19 act() warnings during async state updates
    consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(jest.fn());
    mockAddProperties = jest.fn().mockReturnThis();
    mockBuild = jest.fn().mockReturnValue({});
    mockCreateEventBuilder.mockImplementation(() => ({
      addProperties: mockAddProperties,
      build: mockBuild,
    }));
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('render matches snapshot', () => {
    const props: FooterButtonGroupProps = {
      valueWei: '3210000000000000',
      action: FooterButtonGroupActions.STAKE,
    };

    const { getByText, toJSON } = renderWithProvider(
      <FooterButtonGroup {...props} />,
      { state: mockInitialState },
    );

    expect(getByText(strings('stake.cancel'))).toBeDefined();
    expect(getByText(strings('stake.continue'))).toBeDefined();

    expect(toJSON()).toMatchSnapshot();
  });

  it('navigates to Asset page when cancel is pressed', async () => {
    mockCanGoBack.mockImplementationOnce(() => true);
    const props: FooterButtonGroupProps = {
      valueWei: '3210000000000000',
      action: FooterButtonGroupActions.STAKE,
    };

    const { getByText, toJSON } = renderWithProvider(
      <FooterButtonGroup {...props} />,
      { state: mockInitialState },
    );

    await act(async () => {
      fireEvent.press(getByText(strings('stake.cancel')));
    });

    expect(mockGoBack).toHaveBeenCalledTimes(1);

    expect(toJSON()).toMatchSnapshot();
  });

  it('attempts stake transaction on continue click', async () => {
    mockAttemptDepositTransaction.mockResolvedValueOnce({
      transactionMeta: { id: 'mock-tx-id' },
    });

    const props: FooterButtonGroupProps = {
      valueWei: '3210000000000000',
      action: FooterButtonGroupActions.STAKE,
    };

    const { getByText, toJSON } = renderWithProvider(
      <FooterButtonGroup {...props} />,
      { state: mockInitialState },
    );

    await act(async () => {
      fireEvent.press(getByText(strings('stake.continue')));
    });

    expect(mockAttemptDepositTransaction).toHaveBeenCalled();
    expect(toJSON()).toMatchSnapshot();
  });

  it('attempts unstake transaction on continue click', async () => {
    mockAttemptUnstakeTransaction.mockResolvedValueOnce({
      transactionMeta: { id: 'mock-tx-id' },
    });

    const props: FooterButtonGroupProps = {
      valueWei: '3210000000000000',
      action: FooterButtonGroupActions.UNSTAKE,
    };

    const { getByText, toJSON } = renderWithProvider(
      <FooterButtonGroup {...props} />,
      { state: mockInitialState },
    );

    await act(async () => {
      fireEvent.press(getByText(strings('stake.continue')));
    });

    expect(mockAttemptUnstakeTransaction).toHaveBeenCalled();
    expect(toJSON()).toMatchSnapshot();
  });

  it('handles transaction error correctly', async () => {
    mockAttemptDepositTransaction.mockRejectedValueOnce(
      new Error('Transaction failed'),
    );

    const props: FooterButtonGroupProps = {
      valueWei: '3210000000000000',
      action: FooterButtonGroupActions.STAKE,
    };

    const { getByText, getByTestId } = renderWithProvider(
      <FooterButtonGroup {...props} />,
      {
        state: mockInitialState,
      },
    );

    await act(async () => {
      fireEvent.press(getByText(strings('stake.continue')));
    });

    // After rejection, didSubmitTransaction is set back to false
    const continueButton = getByTestId('continue-button');
    const cancelButton = getByTestId('cancel-button');
    expect(continueButton).not.toBeDisabled();
    expect(cancelButton).not.toBeDisabled();
  });

  it('tracks metrics on cancel press', async () => {
    const props: FooterButtonGroupProps = {
      valueWei: '3210000000000000',
      action: FooterButtonGroupActions.STAKE,
    };

    const { getByText } = renderWithProvider(<FooterButtonGroup {...props} />, {
      state: mockInitialState,
    });

    await act(async () => {
      fireEvent.press(getByText(strings('stake.cancel')));
    });

    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it('disables buttons during transaction', async () => {
    const mockTransactionId = 'mock-tx-id';
    mockAttemptDepositTransaction.mockResolvedValueOnce({
      transactionMeta: { id: mockTransactionId },
    });

    const props: FooterButtonGroupProps = {
      valueWei: '3210000000000000',
      action: FooterButtonGroupActions.STAKE,
    };

    const { getByText, getByTestId } = renderWithProvider(
      <FooterButtonGroup {...props} />,
      {
        state: mockInitialState,
      },
    );

    await act(async () => {
      fireEvent.press(getByText(strings('stake.continue')));
    });

    const continueButton = getByTestId('continue-button');
    const cancelButton = getByTestId('cancel-button');
    expect(continueButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it('shows loading state during transaction', async () => {
    const mockTransactionId = 'mock-tx-id';
    mockAttemptDepositTransaction.mockResolvedValueOnce({
      transactionMeta: { id: mockTransactionId },
    });

    const props: FooterButtonGroupProps = {
      valueWei: '3210000000000000',
      action: FooterButtonGroupActions.STAKE,
    };

    const { getByText, getByTestId } = renderWithProvider(
      <FooterButtonGroup {...props} />,
      {
        state: mockInitialState,
      },
    );

    await act(async () => {
      fireEvent.press(getByText(strings('stake.continue')));
    });

    const continueButton = getByTestId('continue-button');
    // In React 19, the button should be disabled during transaction
    expect(continueButton).toBeDisabled();
  });
});
