import { act } from '@testing-library/react-native';
import React from 'react';
import { cloneDeep } from 'lodash';
import { ScrollView } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  generateContractInteractionState,
  getAppStateForConfirmation,
  personalSignatureConfirmationState,
  stakingClaimConfirmationState,
  stakingDepositConfirmationState,
  stakingWithdrawalConfirmationState,
  typedSignV1ConfirmationState,
  upgradeAccountConfirmation,
} from '../../../../../util/test/confirm-data-helpers';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { Confirm, ConfirmationLoader } from './confirm-component';
import { useTokensWithBalance } from '../../../../UI/Bridge/hooks/useTokensWithBalance';
import { useConfirmActions } from '../../hooks/useConfirmActions';
import { useParams } from '../../../../../util/navigation/navUtils';
import useConfirmationAlerts from '../../hooks/alerts/useConfirmationAlerts';
import { useFullScreenConfirmation } from '../../hooks/ui/useFullScreenConfirmation';

jest.mock('../../hooks/useConfirmActions');

jest.mock('../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../util/navigation/navUtils'),
  useParams: jest.fn().mockReturnValue({
    params: {
      maxValueMode: false,
    },
  }),
}));

jest.mock('../../../../../components/hooks/useEditNonce', () => ({
  useEditNonce: jest.fn().mockReturnValue({}),
}));

jest.mock('../../../../hooks/AssetPolling/AssetPollingProvider', () => ({
  AssetPollingProvider: () => null,
}));

jest.mock('../../hooks/gas/useGasFeeToken');
jest.mock('../../hooks/tokens/useTokenWithBalance');
jest.mock('../../hooks/alerts/useConfirmationAlerts');
jest.mock('../../hooks/ui/useFullScreenConfirmation');
jest.mock('../../../../hooks/useRefreshSmartTransactionsLiveness', () => ({
  useRefreshSmartTransactionsLiveness: jest.fn(),
}));

const mockSetOptions = jest.fn();
const mockNavigation = {
  addListener: jest.fn(),
  dispatch: jest.fn(),
  goBack: jest.fn(),
  navigate: jest.fn(),
  removeListener: jest.fn(),
  setOptions: mockSetOptions,
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
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

jest.mock('../../../../../core/Engine', () => ({
  getTotalEvmFiatAccountBalance: () => ({ tokenFiat: 10 }),
  context: {
    KeyringController: {
      state: {
        keyrings: [
          {
            type: 'HD Key Tree',
            accounts: ['0x935e73edb9ff52e23bac7f7e043a1ecd06d05477'],
            metadata: {
              id: '01JNG7170V9X27V5NFDTY04PJ4',
              name: '',
            },
          },
        ],
      },
    },
    NetworkController: {
      getNetworkConfigurationByNetworkClientId: jest.fn(),
      findNetworkClientIdByChainId: jest.fn(),
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
              id: '1',
              type: 'eip155:eoa',
              address: '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477',
              options: {
                entropySource: '01JNG7170V9X27V5NFDTY04PJ4',
              },
              metadata: {
                name: 'Account 1',
                keyring: {
                  type: 'HD Key Tree',
                },
              },
              scopes: ['eip155:0'],
            },
          },
          selectedAccount: '1',
        },
      },
    },
    TransactionController: {
      getTransactions: jest.fn().mockReturnValue([]),
      getNonceLock: jest.fn().mockReturnValue({ releaseLock: jest.fn() }),
      updateTransaction: jest.fn(),
    },
  },
  controllerMessenger: {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    subscribeOnceIf: jest.fn(),
  },
}));

jest.mock('react-native-gzip', () => ({
  deflate: (str: string) => str,
}));

jest.mock('../../../../UI/Bridge/hooks/useTokensWithBalance', () => ({
  useTokensWithBalance: () => [] as ReturnType<typeof useTokensWithBalance>,
}));

jest.mock('../../../../../core/redux/slices/bridge', () => ({
  ...jest.requireActual('../../../../../core/redux/slices/bridge'),
  selectEnabledSourceChains: jest.fn().mockReturnValue([]),
}));

describe('Confirm', () => {
  const useConfirmActionsMock = jest.mocked(useConfirmActions);
  const mockOnReject = jest.fn();
  const useParamsMock = jest.mocked(useParams);

  beforeEach(() => {
    useConfirmActionsMock.mockReturnValue({
      onReject: mockOnReject,
      onConfirm: jest.fn(),
    });

    jest.mocked(useConfirmationAlerts).mockReturnValue([]);
    jest.mocked(useFullScreenConfirmation).mockReturnValue({
      isFullScreenConfirmation: false,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    mockSetOptions.mockClear();
    mockOnReject.mockClear();
  });

  it('renders modal confirmation', async () => {
    const { getByTestId } = renderWithProvider(<Confirm />, {
      state: typedSignV1ConfirmationState,
    });
    expect(getByTestId('modal-confirmation-container')).toBeDefined();
  });

  it('renders a flat confirmation for specified type(s): staking deposit', () => {
    jest.mocked(useFullScreenConfirmation).mockReturnValue({
      isFullScreenConfirmation: true,
    });

    const { getByTestId } = renderWithProvider(<Confirm />, {
      state: stakingDepositConfirmationState,
    });
    expect(getByTestId('flat-confirmation-container')).toBeDefined();
  });

  it('renders a flat confirmation for specified type(s): staking withdrawal', () => {
    jest.mocked(useFullScreenConfirmation).mockReturnValue({
      isFullScreenConfirmation: true,
    });

    const { getByTestId } = renderWithProvider(<Confirm />, {
      state: stakingWithdrawalConfirmationState,
    });
    expect(getByTestId('flat-confirmation-container')).toBeDefined();
  });

  it('renders information for personal sign', () => {
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

  it('renders information for typed sign v1', () => {
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

  it('renders information for staking deposit', async () => {
    const { getByText } = renderWithProvider(<Confirm />, {
      state: stakingDepositConfirmationState,
    });
    expect(getByText('APR')).toBeDefined();
    expect(getByText('Est. annual reward')).toBeDefined();
    expect(getByText('Reward frequency')).toBeDefined();
    expect(getByText('Withdrawal time')).toBeDefined();
    expect(getByText('Network fee')).toBeDefined();
    expect(getByText('Advanced details')).toBeDefined();
  });

  it('renders information for staking withdrawal', async () => {
    const { getByText } = renderWithProvider(<Confirm />, {
      state: stakingWithdrawalConfirmationState,
    });
    expect(getByText('Withdrawal time')).toBeDefined();
    expect(getByText('Unstaking to')).toBeDefined();
    expect(getByText('Interacting with')).toBeDefined();
    expect(getByText('Network')).toBeDefined();
    expect(getByText('Network fee')).toBeDefined();
  });

  it('renders information for staking claim', async () => {
    const { getByText } = renderWithProvider(<Confirm />, {
      state: stakingClaimConfirmationState,
    });
    expect(getByText('Claiming to')).toBeDefined();
    expect(getByText('Interacting with')).toBeDefined();
    expect(getByText('Pooled Staking')).toBeDefined();
    expect(getByText('Network')).toBeDefined();
    expect(getByText('Ethereum Mainnet')).toBeDefined();
    expect(getByText('Network fee')).toBeDefined();
  });

  it('renders information for contract interaction', async () => {
    const { getByText } = renderWithProvider(<Confirm />, {
      state: generateContractInteractionState,
    });

    expect(getByText('Transaction request')).toBeDefined();
    expect(
      getByText('Review request details before you confirm.'),
    ).toBeDefined();
    expect(getByText('Estimated changes')).toBeDefined();
    expect(getByText('Network fee')).toBeDefined();
  });

  it('renders splash page if present', async () => {
    const { getByText } = renderWithProvider(<Confirm />, {
      state: getAppStateForConfirmation(upgradeAccountConfirmation, {
        PreferencesController: { smartAccountOptIn: false },
      }),
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(getByText('Use smart account?')).toBeTruthy();
  });

  it('displays loading spinner when no approval request exists', () => {
    const stateWithoutRequest = cloneDeep(typedSignV1ConfirmationState);
    stateWithoutRequest.engine.backgroundState.ApprovalController = {
      pendingApprovals: {},
      pendingApprovalCount: 0,
      approvalFlows: [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const { getByTestId } = renderWithProvider(<Confirm />, {
      state: stateWithoutRequest,
    });

    expect(getByTestId('confirm-loader-default')).toBeDefined();
  });

  it('displays alternate loader if specified', () => {
    useParamsMock.mockReturnValue({
      loader: ConfirmationLoader.CustomAmount,
    });

    const stateWithoutRequest = cloneDeep(typedSignV1ConfirmationState);
    stateWithoutRequest.engine.backgroundState.ApprovalController = {
      pendingApprovals: {},
      pendingApprovalCount: 0,
      approvalFlows: [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const { getByTestId } = renderWithProvider(<Confirm />, {
      state: stateWithoutRequest,
    });

    expect(getByTestId('confirm-loader-custom-amount')).toBeDefined();
  });

  it('displays PredictClaim loader when specified', () => {
    useParamsMock.mockReturnValue({
      loader: ConfirmationLoader.PredictClaim,
    });

    const stateWithoutRequest = cloneDeep(typedSignV1ConfirmationState);
    stateWithoutRequest.engine.backgroundState.ApprovalController = {
      pendingApprovals: {},
      pendingApprovalCount: 0,
      approvalFlows: [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const { getByTestId } = renderWithProvider(<Confirm />, {
      state: stateWithoutRequest,
    });

    expect(getByTestId('confirm-loader-predict-claim')).toBeDefined();
  });

  it('displays Transfer loader when specified', () => {
    useParamsMock.mockReturnValue({
      loader: ConfirmationLoader.Transfer,
    });

    const stateWithoutRequest = cloneDeep(typedSignV1ConfirmationState);
    stateWithoutRequest.engine.backgroundState.ApprovalController = {
      pendingApprovals: {},
      pendingApprovalCount: 0,
      approvalFlows: [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const { getByTestId } = renderWithProvider(<Confirm />, {
      state: stateWithoutRequest,
    });

    expect(getByTestId('confirm-loader-transfer')).toBeDefined();
  });

  it('renders InfoLoader with SafeAreaView for CustomAmount loader', () => {
    useParamsMock.mockReturnValue({
      loader: ConfirmationLoader.CustomAmount,
    });

    const stateWithoutRequest = cloneDeep(typedSignV1ConfirmationState);
    stateWithoutRequest.engine.backgroundState.ApprovalController = {
      pendingApprovals: {},
      pendingApprovalCount: 0,
      approvalFlows: [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const { getByTestId, UNSAFE_queryAllByType } = renderWithProvider(
      <Confirm />,
      {
        state: stateWithoutRequest,
      },
    );

    const loaderContainer = getByTestId('confirm-loader-custom-amount');
    const scrollViews = UNSAFE_queryAllByType(ScrollView);

    expect(loaderContainer).toBeDefined();
    expect(scrollViews.length).toBeGreaterThan(0);
  });

  it('renders InfoLoader with SafeAreaView for PredictClaim loader', () => {
    useParamsMock.mockReturnValue({
      loader: ConfirmationLoader.PredictClaim,
    });

    const stateWithoutRequest = cloneDeep(typedSignV1ConfirmationState);
    stateWithoutRequest.engine.backgroundState.ApprovalController = {
      pendingApprovals: {},
      pendingApprovalCount: 0,
      approvalFlows: [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const { getByTestId, UNSAFE_queryAllByType } = renderWithProvider(
      <Confirm />,
      {
        state: stateWithoutRequest,
      },
    );

    const loaderContainer = getByTestId('confirm-loader-predict-claim');
    const scrollViews = UNSAFE_queryAllByType(ScrollView);

    expect(loaderContainer).toBeDefined();
    expect(scrollViews.length).toBeGreaterThan(0);
  });

  it('renders InfoLoader with SafeAreaView for Transfer loader', () => {
    useParamsMock.mockReturnValue({
      loader: ConfirmationLoader.Transfer,
    });

    const stateWithoutRequest = cloneDeep(typedSignV1ConfirmationState);
    stateWithoutRequest.engine.backgroundState.ApprovalController = {
      pendingApprovals: {},
      pendingApprovalCount: 0,
      approvalFlows: [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const { getByTestId, UNSAFE_queryAllByType } = renderWithProvider(
      <Confirm />,
      {
        state: stateWithoutRequest,
      },
    );

    const loaderContainer = getByTestId('confirm-loader-transfer');
    const scrollViews = UNSAFE_queryAllByType(ScrollView);

    expect(loaderContainer).toBeDefined();
    expect(scrollViews.length).toBeGreaterThan(0);
  });

  it('defaults to Default loader when no loader param is provided', () => {
    useParamsMock.mockReturnValue({});

    const stateWithoutRequest = cloneDeep(typedSignV1ConfirmationState);
    stateWithoutRequest.engine.backgroundState.ApprovalController = {
      pendingApprovals: {},
      pendingApprovalCount: 0,
      approvalFlows: [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const { getByTestId } = renderWithProvider(<Confirm />, {
      state: stateWithoutRequest,
    });

    expect(getByTestId('confirm-loader-default')).toBeDefined();
  });

  it('defaults to Default loader when loader param is undefined', () => {
    useParamsMock.mockReturnValue({
      loader: undefined,
    });

    const stateWithoutRequest = cloneDeep(typedSignV1ConfirmationState);
    stateWithoutRequest.engine.backgroundState.ApprovalController = {
      pendingApprovals: {},
      pendingApprovalCount: 0,
      approvalFlows: [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const { getByTestId } = renderWithProvider(<Confirm />, {
      state: stateWithoutRequest,
    });

    expect(getByTestId('confirm-loader-default')).toBeDefined();
  });

  it('sets navigation options with header shown for full screen confirmations', () => {
    jest.mocked(useFullScreenConfirmation).mockReturnValue({
      isFullScreenConfirmation: true,
    });

    renderWithProvider(<Confirm />, {
      state: stakingDepositConfirmationState,
    });

    expect(mockSetOptions).toHaveBeenCalledWith({
      headerShown: true,
      gestureEnabled: true,
    });
  });

  it('sets navigation options with header hidden for non-full screen confirmations', () => {
    jest.mocked(useFullScreenConfirmation).mockReturnValue({
      isFullScreenConfirmation: false,
    });

    renderWithProvider(<Confirm />, {
      state: typedSignV1ConfirmationState,
    });

    expect(mockSetOptions).toHaveBeenCalledWith({
      headerShown: false,
      gestureEnabled: true,
    });
  });

  it('calls onReject when bottom sheet is dismissed', () => {
    const { getByTestId } = renderWithProvider(<Confirm />, {
      state: typedSignV1ConfirmationState,
    });

    const bottomSheet = getByTestId('modal-confirmation-container');
    expect(bottomSheet).toBeDefined();
  });
});
