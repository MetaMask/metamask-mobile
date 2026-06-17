import React from 'react';
import { ViewProps, StyleSheet, InteractionManager } from 'react-native';
import { waitFor } from '@testing-library/react-native';
import {
  renderScreen,
  DeepPartial,
} from '../../../util/test/renderWithProvider';
import QRSigningTransactionModal, {
  QRSignMode,
} from './QRSigningTransactionModal';
import Engine from '../../../core/Engine';
import { useParams } from '../../../util/navigation/navUtils';
import { speedUpTransaction as speedUpTx } from '../../../util/transaction-controller';
import ToastService from '../../../core/ToastService/ToastService';
import { getTransactionUpdateErrorToastOptions } from '../../../util/confirmation/transactions';
import {
  type QrScanRequest,
  QrScanRequestType,
} from '@metamask/eth-qr-keyring';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import type { RootState } from '../../../reducers';

jest.mock('../../../core/Engine');

jest.mock('../../../util/transaction-controller', () => ({
  speedUpTransaction: jest.fn(),
}));

jest.mock('../../../core/ToastService/ToastService', () => ({
  showToast: jest.fn(),
}));

jest.mock('../../../util/confirmation/transactions', () => ({
  getTransactionUpdateErrorToastOptions: jest.fn(),
}));

jest.mock('./QRSigningDetails', () => {
  const { View: MockView } = jest.requireActual('react-native');
  return function MockQRSigningDetails(props: ViewProps) {
    return <MockView testID="QRSigningDetails" {...props} />;
  };
});

jest.mock(
  '../../../component-library/components/BottomSheets/BottomSheet',
  () => 'BottomSheet',
);

jest.mock('../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../util/navigation/navUtils'),
  useParams: jest.fn(),
}));

jest.mock('../../../util/theme', () => {
  const { mockTheme } = jest.requireActual('../../../util/theme');
  return {
    ...jest.requireActual('../../../util/theme'),
    useAppThemeFromContext: jest.fn(() => mockTheme),
  };
});

jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return {
    ...actual,
    StyleSheet: {
      ...actual.StyleSheet,
      create: jest.fn(
        (styles: Parameters<typeof StyleSheet.create>[0]) => styles,
      ),
    },
  };
});

const mockUseParams = useParams as jest.Mock;
const mockSpeedUpTx = speedUpTx as jest.Mock;
const mockShowToast = ToastService.showToast as jest.Mock;
const mockGetTransactionUpdateErrorToastOptions =
  getTransactionUpdateErrorToastOptions as jest.Mock;

describe('QRSigningTransactionModal', () => {
  const mockTransactionId = 'tx-123';
  const mockOnConfirmationComplete = jest.fn();
  const mockPendingScanRequest: QrScanRequest = {
    type: QrScanRequestType.SIGN,
    request: {
      requestId: 'req-123',
      payload: {
        type: 'transaction',
        cbor: 'test-cbor-data',
      },
    },
  };

  const mockSelectedAccount: InternalAccount = {
    address: '0x0987654321098765432109876543210987654321',
    id: 'account-1',
    metadata: {
      name: 'Account 1',
      keyring: {
        type: 'QR Hardware Wallet',
      },
      importTime: 0,
      lastSelected: 0,
    },
    scopes: [],
    options: {},
    methods: [],
    type: 'eip155:eoa',
  };

  const createInitialState = (
    pendingScanRequest: QrScanRequest | null = mockPendingScanRequest,
    selectedAccount: InternalAccount | null = mockSelectedAccount,
  ): DeepPartial<RootState> => ({
    qrKeyringScanner: {
      pendingScanRequest: pendingScanRequest ?? undefined,
    },
    engine: {
      backgroundState: {
        AccountsController: {
          internalAccounts: {
            accounts: selectedAccount ? { 'account-1': selectedAccount } : {},
            selectedAccount: selectedAccount ? 'account-1' : undefined,
          },
        },
      },
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseParams.mockReturnValue({
      transactionId: mockTransactionId,
      onConfirmationComplete: mockOnConfirmationComplete,
    });

    (
      Engine.context as unknown as {
        ApprovalController: { acceptRequest: jest.Mock };
        TransactionController: { stopTransaction: jest.Mock };
      }
    ).ApprovalController = {
      acceptRequest: jest.fn().mockResolvedValue(undefined),
    };
    (
      Engine.context as unknown as {
        TransactionController: { stopTransaction: jest.Mock };
      }
    ).TransactionController = {
      stopTransaction: jest.fn().mockResolvedValue(undefined),
    };

    mockSpeedUpTx.mockResolvedValue(undefined);
    mockGetTransactionUpdateErrorToastOptions.mockImplementation(
      (error: unknown) => ({
        descriptionOptions: { description: String(error) },
      }),
    );
    jest
      .spyOn(InteractionManager, 'runAfterInteractions')
      .mockImplementation((task) => {
        if (typeof task === 'function') {
          task();
        }
        return {
          then: (onfulfilled?: () => void) => Promise.resolve(onfulfilled?.()),
          done: (onfulfilled?: () => void, onrejected?: () => void) =>
            Promise.resolve().then(onfulfilled, onrejected),
          cancel: jest.fn(),
        };
      });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders when pendingScanRequest exists', () => {
    const initialState = createInitialState();

    const { toJSON } = renderScreen(
      QRSigningTransactionModal,
      { name: 'QRSigningTransactionModal' },
      { state: initialState },
    );

    expect(toJSON()).toBeTruthy();
  });

  it('returns null when pendingScanRequest is null', () => {
    const initialState = createInitialState(null);

    const { queryByTestId } = renderScreen(
      QRSigningTransactionModal,
      { name: 'QRSigningTransactionModal' },
      { state: initialState },
    );

    expect(queryByTestId('QRSigningDetails')).toBeNull();
  });

  it('calls ApprovalController.acceptRequest and onConfirmationComplete on success callback', async () => {
    const initialState = createInitialState();

    const { getByTestId } = renderScreen(
      QRSigningTransactionModal,
      { name: 'QRSigningTransactionModal' },
      { state: initialState },
    );

    const qrSigningDetailsElement = getByTestId('QRSigningDetails');
    const successCallback = qrSigningDetailsElement.props.successCallback;

    await successCallback();

    expect(
      Engine.context.ApprovalController.acceptRequest,
    ).toHaveBeenCalledWith(mockTransactionId, undefined, {
      waitForResult: true,
    });

    expect(mockOnConfirmationComplete).toHaveBeenCalledWith(true);
  });

  it('calls onConfirmationComplete(false) on rejection callback', async () => {
    const initialState = createInitialState();

    const { getByTestId } = renderScreen(
      QRSigningTransactionModal,
      { name: 'QRSigningTransactionModal' },
      { state: initialState },
    );

    const qrSigningDetailsElement = getByTestId('QRSigningDetails');
    const cancelCallback = qrSigningDetailsElement.props.cancelCallback;

    await cancelCallback();

    expect(mockOnConfirmationComplete).toHaveBeenCalledWith(false);
  });

  it('calls onConfirmationComplete(false) on failure callback', async () => {
    const initialState = createInitialState();

    const { getByTestId } = renderScreen(
      QRSigningTransactionModal,
      { name: 'QRSigningTransactionModal' },
      { state: initialState },
    );

    const qrSigningDetailsElement = getByTestId('QRSigningDetails');
    const failureCallback = qrSigningDetailsElement.props.failureCallback;

    await failureCallback();

    expect(mockOnConfirmationComplete).toHaveBeenCalledWith(false);
  });

  it('passes correct props to QRSigningDetails component', () => {
    const initialState = createInitialState();

    const { getByTestId } = renderScreen(
      QRSigningTransactionModal,
      { name: 'QRSigningTransactionModal' },
      { state: initialState },
    );

    const qrSigningDetailsElement = getByTestId('QRSigningDetails');

    expect(qrSigningDetailsElement.props.pendingScanRequest).toEqual(
      mockPendingScanRequest,
    );
    expect(qrSigningDetailsElement.props.showCancelButton).toBe(true);
    expect(qrSigningDetailsElement.props.tighten).toBe(true);
    expect(qrSigningDetailsElement.props.showHint).toBe(true);
    expect(qrSigningDetailsElement.props.shouldStartAnimated).toBe(true);
    expect(qrSigningDetailsElement.props.fromAddress).toBe(
      mockSelectedAccount.address,
    );

    expect(typeof qrSigningDetailsElement.props.successCallback).toBe(
      'function',
    );
    expect(typeof qrSigningDetailsElement.props.cancelCallback).toBe(
      'function',
    );
    expect(typeof qrSigningDetailsElement.props.failureCallback).toBe(
      'function',
    );
  });

  it('uses selected account address when available', () => {
    const initialState = createInitialState();

    const { getByTestId } = renderScreen(
      QRSigningTransactionModal,
      { name: 'QRSigningTransactionModal' },
      { state: initialState },
    );

    const qrSigningDetailsElement = getByTestId('QRSigningDetails');

    expect(qrSigningDetailsElement.props.fromAddress).toBe(
      mockSelectedAccount.address,
    );
  });

  it('uses empty string for fromAddress when selected account is not available', () => {
    const initialState = createInitialState(mockPendingScanRequest, null);

    const { getByTestId } = renderScreen(
      QRSigningTransactionModal,
      { name: 'QRSigningTransactionModal' },
      { state: initialState },
    );

    const qrSigningDetailsElement = getByTestId('QRSigningDetails');

    expect(qrSigningDetailsElement.props.fromAddress).toBe('');
  });

  it('shows transaction update error toast when speed-up fails', async () => {
    const speedUpError = new Error('speed up failed');
    mockSpeedUpTx.mockRejectedValueOnce(speedUpError);
    mockUseParams.mockReturnValue({
      transactionId: mockTransactionId,
      onConfirmationComplete: mockOnConfirmationComplete,
      signMode: QRSignMode.SpeedUp,
      gasValues: { gasPrice: '0x1' },
    });

    renderScreen(
      QRSigningTransactionModal,
      { name: 'QRSigningTransactionModal' },
      { state: createInitialState(null) },
    );

    await waitFor(() => {
      expect(mockGetTransactionUpdateErrorToastOptions).toHaveBeenCalledWith(
        speedUpError,
      );
      expect(mockShowToast).toHaveBeenCalledWith({
        descriptionOptions: { description: 'Error: speed up failed' },
      });
      expect(mockOnConfirmationComplete).toHaveBeenCalledWith(false);
    });
  });

  it('shows transaction update error toast when cancel fails', async () => {
    const cancelError = new Error('cancel failed');
    (
      Engine.context.TransactionController.stopTransaction as jest.Mock
    ).mockRejectedValueOnce(cancelError);
    mockUseParams.mockReturnValue({
      transactionId: mockTransactionId,
      onConfirmationComplete: mockOnConfirmationComplete,
      signMode: QRSignMode.Cancel,
      gasValues: { gasPrice: '0x1' },
    });

    renderScreen(
      QRSigningTransactionModal,
      { name: 'QRSigningTransactionModal' },
      { state: createInitialState(null) },
    );

    await waitFor(() => {
      expect(mockGetTransactionUpdateErrorToastOptions).toHaveBeenCalledWith(
        cancelError,
      );
      expect(mockShowToast).toHaveBeenCalledWith({
        descriptionOptions: { description: 'Error: cancel failed' },
      });
      expect(mockOnConfirmationComplete).toHaveBeenCalledWith(false);
    });
  });

  it('does not show transaction update error toast when approval fails', async () => {
    const approvalError = new Error('approval failed');
    (
      Engine.context.ApprovalController.acceptRequest as jest.Mock
    ).mockRejectedValueOnce(approvalError);

    renderScreen(
      QRSigningTransactionModal,
      { name: 'QRSigningTransactionModal' },
      { state: createInitialState(null) },
    );

    await waitFor(() => {
      expect(mockOnConfirmationComplete).toHaveBeenCalledWith(false);
    });

    expect(mockShowToast).not.toHaveBeenCalled();
  });
});
