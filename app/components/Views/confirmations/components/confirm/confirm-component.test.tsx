import React from 'react';
import { cloneDeep } from 'lodash';
import { act, fireEvent } from '@testing-library/react-native';
import { BackHandler, ScrollView, StyleSheet } from 'react-native';
import { BottomSheet } from '@metamask/design-system-react-native';
import { Severity } from '../../types/alerts';
import {
  useSafeAreaFrame,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  generateContractInteractionState,
  batchApprovalConfirmation,
  getAppStateForConfirmation,
  mockTxId,
  personalSignatureConfirmationState,
  stakingClaimConfirmationState,
  stakingDepositConfirmationState,
  stakingWithdrawalConfirmationState,
  typedSignV1ConfirmationState,
} from '../../../../../util/test/confirm-data-helpers';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { ConfirmationUIType } from '../../ConfirmationView.testIds';
import { TraceName, endTrace, trace } from '../../../../../util/trace';
import { Confirm, ConfirmationLoader } from './confirm-component';
import { TransactionType } from '@metamask/transaction-controller';
import { useTokensWithBalance } from '../../../../UI/Bridge/hooks/useTokensWithBalance';
import { useConfirmActions } from '../../hooks/useConfirmActions';
import { useConfirmReject } from '../../hooks/useConfirmReject';
import { useParams } from '../../../../../util/navigation/navUtils';
import useConfirmationAlerts from '../../hooks/alerts/useConfirmationAlerts';
import { useFullScreenConfirmation } from '../../hooks/ui/useFullScreenConfirmation';
import styleSheet from './confirm-component.styles';
import { mockTheme } from '../../../../../util/theme';
import Engine from '../../../../../core/Engine';

jest.mock('../../hooks/useConfirmReject');
// Confirm renders the footer, which still depends on the full useConfirmActions
// chain (useTransactionConfirm -> useFiatConfirm -> ramps -> react-query).
jest.mock('../../hooks/useConfirmActions');

jest.mock('../../../../../util/trace', () => ({
  ...jest.requireActual('../../../../../util/trace'),
  trace: jest.fn(),
  endTrace: jest.fn(),
}));

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
jest.mock('../../hooks/pay/useTransactionPayAutoFiatSubmission');
jest.mock('../../../../hooks/useRefreshSmartTransactionsLiveness', () => ({
  useRefreshSmartTransactionsLiveness: jest.fn(),
}));

jest.mock('../info/money-account-deposit-info', () => ({
  MoneyAccountDepositInfo: () => null,
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
  state: {},
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
  const useConfirmRejectMock = jest.mocked(useConfirmReject);
  const mockOnReject = jest.fn();
  const useParamsMock = jest.mocked(useParams);
  const MEMBERSHIP_SUBSCRIPTION_TRANSACTION_TYPE =
    TransactionType.membershipSubscription;

  const mockGeneralAlert = [
    {
      key: 'membership-alert',
      title: 'Membership alert',
      severity: Severity.Danger,
      message: 'Generic membership alert',
    },
  ];

  beforeEach(() => {
    useParamsMock.mockReturnValue({});
    useConfirmRejectMock.mockReturnValue({
      onReject: mockOnReject,
    });
    useConfirmActionsMock.mockReturnValue({
      onReject: jest.fn(),
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

  it('hides the generic alert banner for nested membership batch confirmations', () => {
    jest.mocked(useConfirmationAlerts).mockReturnValue(mockGeneralAlert);

    const membershipBatchConfirmation = cloneDeep(batchApprovalConfirmation);
    membershipBatchConfirmation.nestedTransactions = [
      ...(membershipBatchConfirmation.nestedTransactions ?? []),
      {
        type: MEMBERSHIP_SUBSCRIPTION_TRANSACTION_TYPE,
        to: '0x0000000000000000000000000000000000000001',
        data: '0x',
        value: '0x0',
      },
    ];

    const { queryByTestId } = renderWithProvider(<Confirm />, {
      state: getAppStateForConfirmation(membershipBatchConfirmation),
    });

    expect(queryByTestId('security-alert-banner-0')).toBeNull();
  });

  it('keeps the generic alert banner eligible for regular transaction controls', () => {
    jest.mocked(useConfirmationAlerts).mockReturnValue(mockGeneralAlert);

    const { getByTestId } = renderWithProvider(<Confirm />, {
      state: generateContractInteractionState,
    });

    expect(getByTestId('security-alert-banner-0')).toBeOnTheScreen();
  });

  describe('forced bottom sheet', () => {
    beforeEach(() => {
      jest.mocked(useSafeAreaFrame).mockReturnValue({
        width: 400,
        height: 800,
        x: 0,
        y: 0,
      });
      jest.mocked(useSafeAreaInsets).mockReturnValue({
        top: 40,
        bottom: 20,
        left: 0,
        right: 0,
      });
    });

    it.each([
      [ConfirmationLoader.CustomAmount, 'custom-amount-skeleton'],
      [
        ConfirmationLoader.AdvancedCustomAmount,
        'advanced-custom-amount-info-skeleton',
      ],
      [
        ConfirmationLoader.PrefillCustomAmount,
        'prefill-custom-amount-info-skeleton',
      ],
    ])(
      'renders %s skeleton inside the non-dismissible sheet',
      (loader, skeletonTestId) => {
        useParamsMock.mockReturnValue({ forceBottomSheet: true, loader });
        const initialState = cloneDeep(typedSignV1ConfirmationState);
        const state = {
          ...initialState,
          engine: {
            ...initialState.engine,
            backgroundState: {
              ...initialState.engine.backgroundState,
              ApprovalController: {
                ...initialState.engine.backgroundState.ApprovalController,
                pendingApprovals: {},
                pendingApprovalCount: 0,
              },
            },
          },
        };

        const { getByTestId, UNSAFE_getByType } = renderWithProvider(
          <Confirm />,
          { state },
        );

        expect(getByTestId(skeletonTestId)).toBeOnTheScreen();
        expect(UNSAFE_getByType(BottomSheet).props.isInteractable).toBe(false);
        expect(mockSetOptions).not.toHaveBeenCalledWith(
          expect.objectContaining({ gestureEnabled: true }),
        );
        expect(
          StyleSheet.flatten(
            getByTestId('confirm-loader-bottom-sheet').props
              .contentContainerStyle,
          ),
        ).toMatchObject({ minHeight: 444, flexGrow: 1 });
        expect(
          StyleSheet.flatten(
            getByTestId('confirm-loader-bottom-sheet').props.style,
          ),
        ).not.toHaveProperty('height');
      },
    );

    it.each([
      [undefined, 480],
      [70, 560],
      [100, 760],
    ])(
      'uses percentage %s as a minimum bounded by the safe area',
      (percentage, height) => {
        useParamsMock.mockReturnValue({
          forceBottomSheet: true,
          bottomSheetHeightPercentage: percentage,
        });

        const { UNSAFE_getByType } = renderWithProvider(<Confirm />, {
          state: typedSignV1ConfirmationState,
        });

        expect(UNSAFE_getByType(BottomSheet).props.twClassName).toBe(
          `min-h-[${height}px]`,
        );
      },
    );

    it('keeps the same sheet mounted when an approval arrives', async () => {
      useParamsMock.mockReturnValue({
        forceBottomSheet: true,
        loader: ConfirmationLoader.CustomAmount,
      });
      const initialState = cloneDeep(typedSignV1ConfirmationState);
      const approvals = initialState.engine.backgroundState.ApprovalController;
      const state = {
        ...initialState,
        engine: {
          ...initialState.engine,
          backgroundState: {
            ...initialState.engine.backgroundState,
            ApprovalController: {
              ...approvals,
              pendingApprovals: {},
              pendingApprovalCount: 0,
            },
          },
        },
      };
      const { store, UNSAFE_getByType, queryByTestId } = renderWithProvider(
        <Confirm />,
        { state },
      );
      const sheet = UNSAFE_getByType(BottomSheet);

      await act(async () => {
        Object.assign(Engine.state, { ApprovalController: approvals });
        store.dispatch({
          type: 'UPDATE_BG_STATE',
          payload: { key: 'ApprovalController' },
        });
      });

      expect(UNSAFE_getByType(BottomSheet)).toBe(sheet);
      expect(sheet.props.isInteractable).toBe(true);
      expect(queryByTestId('confirm-loader-bottom-sheet')).toBeNull();
      fireEvent(sheet, 'close');
      expect(mockOnReject).toHaveBeenCalledTimes(1);
    });
  });

  it('leaves native ScrollView flex defaults intact for fullscreen and sheets', () => {
    const fullscreen = styleSheet({
      theme: mockTheme,
      vars: { isFullScreenConfirmation: true },
    });
    const sheet = styleSheet({
      theme: mockTheme,
      vars: { isFullScreenConfirmation: false, expandToSheetHeight: true },
    });

    expect(fullscreen.scrollView).not.toHaveProperty('flexGrow');
    expect(sheet.scrollView).not.toHaveProperty('flexGrow');
    expect(fullscreen.scrollViewContent.flexGrow).toBe(1);
    expect(sheet.scrollViewContent.flexGrow).toBe(1);
    expect(fullscreen.confirmContainer).not.toHaveProperty('flexGrow');
    expect(sheet.confirmContainer.flexGrow).toBe(1);
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
    const { getAllByRole, getByText } = renderWithProvider(<Confirm />, {
      state: personalSignatureConfirmationState,
    });
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
      renderWithProvider(<Confirm />, {
        state: typedSignV1ConfirmationState,
      });
    expect(getByText('Signature request')).toBeDefined();
    expect(getByText('Request from')).toBeDefined();
    expect(getByText('metamask.github.io')).toBeDefined();
    expect(getAllByText('Message')).toHaveLength(2);
    expect(getByText('Hi, Alice!')).toBeDefined();
    expect(getAllByRole('button')).toHaveLength(2);
    expect(queryByText('Risk signals detected')).toBeNull();
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

  it('prevents dismissing the loading state before an approval request exists', () => {
    const removeBackHandler = jest.fn();
    jest.spyOn(BackHandler, 'addEventListener').mockReturnValue({
      remove: removeBackHandler,
    });

    const stateWithoutRequest = cloneDeep(typedSignV1ConfirmationState);
    stateWithoutRequest.engine.backgroundState.ApprovalController = {
      pendingApprovals: {},
      pendingApprovalCount: 0,
      approvalFlows: [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    renderWithProvider(<Confirm />, {
      state: stateWithoutRequest,
    });

    expect(mockSetOptions).toHaveBeenCalledWith({
      gestureEnabled: false,
    });

    expect(BackHandler.addEventListener).toHaveBeenCalledWith(
      'hardwareBackPress',
      expect.any(Function),
    );

    const backHandlerCallback = jest.mocked(BackHandler.addEventListener).mock
      .calls[0][1];

    expect(backHandlerCallback()).toBe(true);
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

  it('displays AdvancedCustomAmount loader when specified', () => {
    useParamsMock.mockReturnValue({
      loader: ConfirmationLoader.AdvancedCustomAmount,
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

    expect(getByTestId('confirm-loader-advanced-custom-amount')).toBeDefined();
  });

  it('displays PrefillCustomAmount loader when specified', () => {
    useParamsMock.mockReturnValue({
      loader: ConfirmationLoader.PrefillCustomAmount,
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

    expect(getByTestId('confirm-loader-prefill-custom-amount')).toBeDefined();
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

  it('renders InfoLoader for CustomAmount loader', () => {
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

  it('renders InfoLoader for PredictClaim loader', () => {
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

  it('renders InfoLoader for AdvancedCustomAmount loader', () => {
    useParamsMock.mockReturnValue({
      loader: ConfirmationLoader.AdvancedCustomAmount,
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

    const loaderContainer = getByTestId(
      'confirm-loader-advanced-custom-amount',
    );
    const scrollViews = UNSAFE_queryAllByType(ScrollView);

    expect(loaderContainer).toBeDefined();
    expect(scrollViews.length).toBeGreaterThan(0);
  });

  it('renders InfoLoader for Transfer loader', () => {
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

  describe('confirmation load trace', () => {
    const traceMock = jest.mocked(trace);
    const endTraceMock = jest.mocked(endTrace);

    it('records the load trace when a full screen confirmation paints', () => {
      jest.mocked(useFullScreenConfirmation).mockReturnValue({
        isFullScreenConfirmation: true,
      });

      const { getByTestId } = renderWithProvider(<Confirm />, {
        state: generateContractInteractionState,
      });

      expect(traceMock).not.toHaveBeenCalled();

      fireEvent(getByTestId(ConfirmationUIType.FLAT), 'layout');

      expect(traceMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.TransactionConfirmationLoad,
          id: mockTxId,
          forceTransaction: true,
        }),
      );
      expect(endTraceMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.TransactionConfirmationLoad,
          id: mockTxId,
        }),
      );
    });

    it('records the load trace when a modal confirmation paints', () => {
      jest.mocked(useFullScreenConfirmation).mockReturnValue({
        isFullScreenConfirmation: false,
      });

      const { getByTestId } = renderWithProvider(<Confirm />, {
        state: generateContractInteractionState,
      });

      fireEvent(getByTestId('transaction'), 'layout');

      expect(traceMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.TransactionConfirmationLoad,
          id: mockTxId,
        }),
      );
    });

    it('does not record the load trace for signature confirmations', () => {
      const { getByTestId } = renderWithProvider(<Confirm />, {
        state: personalSignatureConfirmationState,
      });

      fireEvent(getByTestId('personal_sign'), 'layout');

      expect(traceMock).not.toHaveBeenCalled();
      expect(endTraceMock).not.toHaveBeenCalled();
    });
  });
});
