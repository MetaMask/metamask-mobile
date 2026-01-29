import React from 'react';
import { ViewProps, StyleSheet } from 'react-native';
import {
  renderScreen,
  DeepPartial,
} from '../../../util/test/renderWithProvider';
import QRSigningTransactionModal from './QRSigningTransactionModal';
import Engine from '../../../core/Engine';
import { useParams } from '../../../util/navigation/navUtils';
import {
  type QrScanRequest,
  QrScanRequestType,
} from '@metamask/eth-qr-keyring';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import type { RootState } from '../../../reducers';

jest.mock('../../../core/Engine');

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

jest.mock('../../../util/theme', () => ({
  ...jest.requireActual('../../../util/theme'),
  useAppThemeFromContext: jest.fn(() => ({
    colors: {
      background: {
        default: '#FFFFFF',
      },
      primary: {
        default: '#037DD6',
      },
    },
  })),
}));

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
        ApprovalController: { accept: jest.Mock };
      }
    ).ApprovalController = {
      accept: jest.fn().mockResolvedValue(undefined),
    };
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

  it('calls ApprovalController.accept and onConfirmationComplete on success callback', async () => {
    const initialState = createInitialState();

    const { getByTestId } = renderScreen(
      QRSigningTransactionModal,
      { name: 'QRSigningTransactionModal' },
      { state: initialState },
    );

    const qrSigningDetailsElement = getByTestId('QRSigningDetails');
    const successCallback = qrSigningDetailsElement.props.successCallback;

    await successCallback();

    expect(Engine.context.ApprovalController.accept).toHaveBeenCalledWith(
      mockTransactionId,
      undefined,
      { waitForResult: true },
    );

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
    expect(qrSigningDetailsElement.props.bypassAndroidCameraAccessCheck).toBe(
      false,
    );
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
});
