import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import {
  __clearLastMockedMethods,
  __getLastMockedMethods,
} from '../../../../../__mocks__/rive-react-native';
import {
  HardwareWalletsSwapsState,
  HardwareWalletsSwapsStatus,
  HardwareWalletsSwapsStepKind,
} from './HardwareWalletsSwaps.state';
import { HardwareWalletsSwaps } from './HardwareWalletsSwaps';
import { HardwareWalletsSwapsSelectorsIDs } from './HardwareWalletsSwaps.testIds';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

jest.mock('rive-react-native', () =>
  jest.requireActual('../../../../../__mocks__/rive-react-native'),
);

jest.mock(
  '../../../../../animations/generic_hardware_wallet.riv',
  () => 'mockGenericHardwareWalletRiv',
);

const mockSubmitBridgeTx = jest.fn();
jest.mock('../../../../../util/bridge/hooks/useSubmitBridgeTx', () => ({
  __esModule: true,
  default: () => ({ submitBridgeTx: mockSubmitBridgeTx }),
}));

jest.mock('../../hooks/bridgeSubmissionCache', () => ({
  getBridgeSubmissionCache: jest.fn(() => null),
  clearBridgeSubmissionCache: jest.fn(),
  setBridgeSubmissionCache: jest.fn(),
}));

jest.mock('../../../../../core/Engine', () => ({
  controllerMessenger: {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
}));

const renderScreen = (
  hardwareWalletsSwaps: Partial<HardwareWalletsSwapsState>,
) =>
  renderWithProvider(<HardwareWalletsSwaps />, {
    state: {
      bridge: {
        hardwareWalletsSwaps: {
          status: HardwareWalletsSwapsStatus.Waiting,
          currentStep: 1,
          totalSteps: 2,
          disconnectedStep: null,
          steps: [
            {
              kind: HardwareWalletsSwapsStepKind.Approval,
              status: 'waiting',
            },
            {
              kind: HardwareWalletsSwapsStepKind.Transaction,
              status: 'waiting',
            },
          ],
          ...hardwareWalletsSwaps,
        },
      },
    },
  });

describe('HardwareWalletsSwaps', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __clearLastMockedMethods();
  });

  it('renders the first waiting state', () => {
    const { getByTestId } = renderScreen({});

    expect(
      getByTestId(HardwareWalletsSwapsSelectorsIDs.CONTAINER),
    ).toBeTruthy();
    expect(
      getByTestId(HardwareWalletsSwapsSelectorsIDs.TITLE).props.children,
    ).toContain('(1/2)');
  });

  it('renders the submitted state', () => {
    const { getByTestId } = renderScreen({
      status: HardwareWalletsSwapsStatus.Submitted,
      currentStep: 2,
      steps: [
        {
          kind: HardwareWalletsSwapsStepKind.Approval,
          status: 'signed',
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: 'signed',
        },
      ],
    });

    expect(
      getByTestId(HardwareWalletsSwapsSelectorsIDs.TITLE).props.children,
    ).toBe('Transaction submitted');
  });

  it.each([
    {
      status: HardwareWalletsSwapsStatus.Waiting,
      steps: [
        {
          kind: HardwareWalletsSwapsStepKind.Approval,
          status: 'waiting' as const,
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: 'waiting' as const,
        },
      ],
      expectedTrigger: 'reset',
    },
    {
      status: HardwareWalletsSwapsStatus.Waiting,
      steps: [
        {
          kind: HardwareWalletsSwapsStepKind.Approval,
          status: 'signing' as const,
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: 'waiting' as const,
        },
      ],
      expectedTrigger: 'wallet_locked',
    },
    {
      status: HardwareWalletsSwapsStatus.Rejected,
      steps: [
        {
          kind: HardwareWalletsSwapsStepKind.Approval,
          status: 'rejected' as const,
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: 'waiting' as const,
        },
      ],
      expectedTrigger: 'error',
    },
    {
      status: HardwareWalletsSwapsStatus.Submitted,
      currentStep: 2,
      steps: [
        {
          kind: HardwareWalletsSwapsStepKind.Approval,
          status: 'signed' as const,
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: 'signed' as const,
        },
      ],
      expectedTrigger: 'found',
    },
    {
      status: HardwareWalletsSwapsStatus.Idle,
      currentStep: 0,
      totalSteps: 0,
      steps: [],
      expectedTrigger: 'not_found',
    },
    {
      status: HardwareWalletsSwapsStatus.Cancelled,
      steps: [
        {
          kind: HardwareWalletsSwapsStepKind.Approval,
          status: 'waiting' as const,
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: 'waiting' as const,
        },
      ],
      expectedTrigger: 'wallet_disconnected',
    },
  ])('fires the $expectedTrigger animation trigger', (progressState) => {
    const { getByTestId } = renderScreen(progressState);

    expect(
      getByTestId(HardwareWalletsSwapsSelectorsIDs.RIVE_ANIMATION).props
        .stateMachineName,
    ).toBe('wallet_statesi wan');
    expect(__getLastMockedMethods()?.fireState).toHaveBeenCalledWith(
      'wallet_statesi wan',
      progressState.expectedTrigger,
    );
  });

  it('navigates back to Bridge view when cancel is pressed', () => {
    const { getByTestId } = renderScreen({});

    fireEvent.press(
      getByTestId(HardwareWalletsSwapsSelectorsIDs.CANCEL_BUTTON),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.BRIDGE_VIEW);
  });

  it('dispatches RETRY and re-submits when try again is pressed', async () => {
    const cachedParams = {
      quoteResponse: { id: 'test' } as any,
      location: undefined,
      transactionActiveAbTests: undefined,
    };
    const { getBridgeSubmissionCache } = jest.requireMock(
      '../../hooks/bridgeSubmissionCache',
    );
    getBridgeSubmissionCache.mockReturnValue(cachedParams);
    mockSubmitBridgeTx.mockResolvedValue({ success: true });

    const { getByTestId, store } = renderScreen({
      status: HardwareWalletsSwapsStatus.Rejected,
      steps: [
        {
          kind: HardwareWalletsSwapsStepKind.Approval,
          status: 'rejected',
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: 'waiting',
        },
      ],
    });

    fireEvent.press(
      getByTestId(HardwareWalletsSwapsSelectorsIDs.TRY_AGAIN_BUTTON),
    );

    const state = store.getState();
    expect(state.bridge.hardwareWalletsSwaps.status).toBe(
      HardwareWalletsSwapsStatus.Waiting,
    );

    await waitFor(() => {
      expect(mockSubmitBridgeTx).toHaveBeenCalledWith(cachedParams);
    });
  });

  it('navigates to transactions when done is pressed', () => {
    const { getByTestId } = renderScreen({
      status: HardwareWalletsSwapsStatus.Submitted,
      currentStep: 2,
      steps: [
        {
          kind: HardwareWalletsSwapsStepKind.Approval,
          status: 'signed',
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: 'signed',
        },
      ],
    });

    fireEvent.press(getByTestId(HardwareWalletsSwapsSelectorsIDs.DONE_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
  });

  it('renders the disconnected state with reconnect button', () => {
    const { getByTestId, queryByTestId } = renderScreen({
      status: HardwareWalletsSwapsStatus.Disconnected,
      disconnectedStep: 1,
      steps: [
        {
          kind: HardwareWalletsSwapsStepKind.Approval,
          status: 'waiting',
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: 'waiting',
        },
      ],
    });

    expect(
      getByTestId(HardwareWalletsSwapsSelectorsIDs.TITLE).props.children,
    ).toBe('Device disconnected');
    expect(
      getByTestId(HardwareWalletsSwapsSelectorsIDs.RECONNECT_BUTTON),
    ).toBeTruthy();
    expect(
      queryByTestId(HardwareWalletsSwapsSelectorsIDs.TRY_AGAIN_BUTTON),
    ).toBeNull();
  });

  it('dispatches RETRY when reconnect is pressed', () => {
    const { getByTestId, store } = renderScreen({
      status: HardwareWalletsSwapsStatus.Disconnected,
      disconnectedStep: 1,
      steps: [
        {
          kind: HardwareWalletsSwapsStepKind.Approval,
          status: 'waiting',
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: 'waiting',
        },
      ],
    });

    fireEvent.press(
      getByTestId(HardwareWalletsSwapsSelectorsIDs.RECONNECT_BUTTON),
    );

    const state = store.getState();
    expect(state.bridge.hardwareWalletsSwaps.status).toBe(
      HardwareWalletsSwapsStatus.Waiting,
    );
  });

  it('renders the failed state with try again button', () => {
    const { getByTestId, queryByTestId } = renderScreen({
      status: HardwareWalletsSwapsStatus.Failed,
      steps: [
        {
          kind: HardwareWalletsSwapsStepKind.Approval,
          status: 'waiting',
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: 'waiting',
        },
      ],
    });

    expect(
      getByTestId(HardwareWalletsSwapsSelectorsIDs.TITLE).props.children,
    ).toBe('Transaction failed');
    expect(
      getByTestId(HardwareWalletsSwapsSelectorsIDs.TRY_AGAIN_BUTTON),
    ).toBeTruthy();
    expect(
      queryByTestId(HardwareWalletsSwapsSelectorsIDs.RECONNECT_BUTTON),
    ).toBeNull();
  });

  it('fires the wallet_disconnected animation trigger for disconnected state', () => {
    const { getByTestId } = renderScreen({
      status: HardwareWalletsSwapsStatus.Disconnected,
      disconnectedStep: 1,
      steps: [
        {
          kind: HardwareWalletsSwapsStepKind.Approval,
          status: 'waiting' as const,
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: 'waiting' as const,
        },
      ],
    });

    expect(__getLastMockedMethods()?.fireState).toHaveBeenCalledWith(
      'wallet_statesi wan',
      'wallet_disconnected',
    );
  });

  it('fires the error animation trigger for failed state', () => {
    const { getByTestId } = renderScreen({
      status: HardwareWalletsSwapsStatus.Failed,
      steps: [
        {
          kind: HardwareWalletsSwapsStepKind.Approval,
          status: 'waiting' as const,
        },
        {
          kind: HardwareWalletsSwapsStepKind.Transaction,
          status: 'waiting' as const,
        },
      ],
    });

    expect(__getLastMockedMethods()?.fireState).toHaveBeenCalledWith(
      'wallet_statesi wan',
      'error',
    );
  });
});
