import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { TransactionMeta } from '@metamask/transaction-controller';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { CancelSpeedupModal } from './cancel-speedup-modal';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { useCancelSpeedupGas } from '../../../hooks/gas/useCancelSpeedupGas';

jest.mock('react-native-modal', () => {
  const RN = jest.requireActual<typeof import('react')>('react');
  return {
    __esModule: true,
    default: ({
      children,
      isVisible,
    }: {
      children: React.ReactNode;
      isVisible: boolean;
    }) => (isVisible ? RN.createElement(RN.Fragment, null, children) : null),
  };
});

jest.mock('../../../../../UI/NetworkAssetLogo', () => ({
  __esModule: true,
  default: function MockNetworkAssetLogo() {
    return null;
  },
}));

jest.mock(
  '../../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const RN = jest.requireActual<typeof import('react')>('react');
    return {
      __esModule: true,
      default: RN.forwardRef(
        (
          props: { children: React.ReactNode },
          ref: React.Ref<{
            onCloseBottomSheet: (cb?: () => void) => void;
            onOpenBottomSheet: (cb?: () => void) => void;
          }>,
        ) => {
          RN.useImperativeHandle(ref, () => ({
            onCloseBottomSheet: (callback?: () => void | Promise<void>) => {
              Promise.resolve(callback?.()).catch(() => {
                // Ignore errors from callback
              });
            },
            onOpenBottomSheet: () => undefined,
          }));
          return RN.createElement(RN.Fragment, null, props.children);
        },
      ),
    };
  },
);

const defaultGasValues = {
  paramsForController: {
    maxFeePerGas: '0x1',
    maxPriorityFeePerGas: '0x1',
  },
  networkFeeDisplay: '0.001 ETH',
  networkFeeNative: '0.001',
  networkFeeFiat: '$1.80',
  nativeTokenSymbol: 'ETH',
  isInitialGasReady: true,
  isTransactionModifiable: true,
};

jest.mock('../../../hooks/gas/useCancelSpeedupGas', () => ({
  useCancelSpeedupGas: jest.fn(),
  getBumpParamsForCancelSpeedup: jest.fn(() => ({
    gasValues: { maxFeePerGas: '0x1', maxPriorityFeePerGas: '0x1' },
    userFeeLevel: 'medium',
  })),
}));

jest.mock('../../../../../../util/transaction-controller', () => ({
  ...jest.requireActual('../../../../../../util/transaction-controller'),
  updateTransactionGasFees: jest.fn(),
  updatePreviousGasParams: jest.fn(),
}));

jest.mock('../../../hooks/gas/useGasFeeEstimates', () => ({
  useGasFeeEstimates: jest.fn(() => ({ gasFeeEstimates: {} })),
}));

jest.mock('../../../../../../core/ToastService/ToastService', () => ({
  __esModule: true,
  default: { showToast: jest.fn() },
}));

jest.mock('../../../context/gas-fee-modal-transaction', () => ({
  GasFeeModalTransactionProvider: ({
    children,
  }: {
    children: React.ReactNode;
  }) => children,
}));

jest.mock('../gas-fee-modal', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } =
    jest.requireActual<typeof import('react-native')>('react-native');
  return {
    GasFeeModal: () => React.createElement(View, { testID: 'gas-fee-modal' }),
  };
});

jest.mock('../../gas/gas-speed', () => {
  const RN = jest.requireActual<typeof import('react')>('react');
  const { Text } =
    jest.requireActual<typeof import('react-native')>('react-native');
  return {
    GasSpeed: ({ transactionId }: { transactionId?: string | null }) =>
      transactionId ? RN.createElement(Text, null, 'Market ~ 15 sec') : null,
  };
});

const mockedUseCancelSpeedupGas = jest.mocked(useCancelSpeedupGas);

const baseState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      PreferencesController: {
        ...backgroundState.PreferencesController,
        privacyMode: false,
      },
    },
  },
};

describe('CancelSpeedupModal', () => {
  const mockOnConfirm = jest.fn();
  const mockOnClose = jest.fn();

  const defaultProps = {
    isVisible: true,
    isCancel: false,
    tx: {
      id: 'tx-1',
      chainId: '0x1',
      txParams: { gas: '0x5208' },
    } as unknown as TransactionMeta,
    onConfirm: mockOnConfirm,
    onClose: mockOnClose,
    confirmDisabled: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseCancelSpeedupGas.mockReturnValue(defaultGasValues);
  });

  it('renders speed up modal with correct content', () => {
    const { getByText } = renderWithProvider(
      <CancelSpeedupModal {...defaultProps} />,
      { state: baseState },
    );

    expect(getByText('Speed up Transaction')).toBeOnTheScreen();
    expect(
      getByText('This network fee will replace the original.'),
    ).toBeOnTheScreen();
    expect(getByText('Network fee')).toBeOnTheScreen();
    expect(getByText('Speed')).toBeOnTheScreen();
    expect(getByText('ETH')).toBeOnTheScreen();
    expect(getByText('$1.80')).toBeOnTheScreen();
    expect(getByText('Market ~ 15 sec')).toBeOnTheScreen();
    expect(getByText('Confirm')).toBeOnTheScreen();
  });

  it('renders cancel modal with correct content', () => {
    const { getByText } = renderWithProvider(
      <CancelSpeedupModal {...defaultProps} isCancel />,
      { state: baseState },
    );

    expect(getByText('Cancel Transaction')).toBeOnTheScreen();
    expect(
      getByText(
        'This transaction will be canceled and this network fee will replace the original.',
      ),
    ).toBeOnTheScreen();
  });

  it('does not render fiat value when null', () => {
    mockedUseCancelSpeedupGas.mockReturnValue({
      ...defaultGasValues,
      networkFeeFiat: null,
    });

    const { queryByText } = renderWithProvider(
      <CancelSpeedupModal {...defaultProps} />,
      { state: baseState },
    );

    expect(queryByText('$1.80')).toBeNull();
  });

  it('calls onConfirm with correct params when Confirm is pressed', async () => {
    const { getByText } = renderWithProvider(
      <CancelSpeedupModal {...defaultProps} />,
      { state: baseState },
    );

    fireEvent.press(getByText('Confirm'));

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith({
        maxFeePerGas: '0x1',
        maxPriorityFeePerGas: '0x1',
      });
    });
  });

  it('does not call onConfirm when button is disabled', () => {
    const { getByText } = renderWithProvider(
      <CancelSpeedupModal {...defaultProps} confirmDisabled />,
      { state: baseState },
    );

    fireEvent.press(getByText('Confirm'));

    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('passes correct props to useCancelSpeedupGas hook', () => {
    renderWithProvider(<CancelSpeedupModal {...defaultProps} />, {
      state: baseState,
    });

    expect(mockedUseCancelSpeedupGas).toHaveBeenCalledWith({
      txId: defaultProps.tx?.id,
    });
  });

  it('handles null tx gracefully', () => {
    const { getByText } = renderWithProvider(
      <CancelSpeedupModal {...defaultProps} tx={null} />,
      { state: baseState },
    );

    expect(getByText('Speed up Transaction')).toBeOnTheScreen();
    expect(getByText('Network fee')).toBeOnTheScreen();
  });

  it('does not render when isVisible is false', () => {
    const { queryByText } = renderWithProvider(
      <CancelSpeedupModal {...defaultProps} isVisible={false} />,
      { state: baseState },
    );

    expect(queryByText('Speed up Transaction')).toBeNull();
    expect(queryByText('Network fee')).toBeNull();
  });

  it('dismisses gas modal when parent modal closes', async () => {
    const { getByTestId, queryByTestId, rerender } = renderWithProvider(
      <CancelSpeedupModal {...defaultProps} />,
      { state: baseState },
    );

    fireEvent.press(getByTestId('cancel-speedup-edit-gas'));

    expect(getByTestId('gas-fee-modal')).toBeOnTheScreen();

    rerender(<CancelSpeedupModal {...defaultProps} isVisible={false} />);

    await waitFor(() => {
      expect(queryByTestId('gas-fee-modal')).toBeNull();
    });
  });

  it('does not show edit gas when transaction is not modifiable', () => {
    mockedUseCancelSpeedupGas.mockReturnValue({
      ...defaultGasValues,
      isTransactionModifiable: false,
    });

    const { queryByTestId } = renderWithProvider(
      <CancelSpeedupModal {...defaultProps} />,
      { state: baseState },
    );

    expect(queryByTestId('cancel-speedup-edit-gas')).toBeNull();
  });

  it('dismisses gas modal when transaction becomes non-modifiable', async () => {
    mockedUseCancelSpeedupGas.mockReturnValue({
      ...defaultGasValues,
      isTransactionModifiable: true,
    });

    const { getByTestId, queryByTestId, rerender } = renderWithProvider(
      <CancelSpeedupModal {...defaultProps} />,
      { state: baseState },
    );

    fireEvent.press(getByTestId('cancel-speedup-edit-gas'));
    expect(getByTestId('gas-fee-modal')).toBeOnTheScreen();

    mockedUseCancelSpeedupGas.mockReturnValue({
      ...defaultGasValues,
      isTransactionModifiable: false,
    });
    rerender(<CancelSpeedupModal {...defaultProps} />);

    await waitFor(() => {
      expect(queryByTestId('gas-fee-modal')).toBeNull();
    });
  });

  it('does not call onConfirm when isInitialGasReady is false', () => {
    mockedUseCancelSpeedupGas.mockReturnValue({
      ...defaultGasValues,
      isInitialGasReady: false,
    });

    const { getByText } = renderWithProvider(
      <CancelSpeedupModal {...defaultProps} />,
      { state: baseState },
    );

    fireEvent.press(getByText('Confirm'));

    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('calls updatePreviousGasParams with all gas fields for a legacy tx', async () => {
    const { updatePreviousGasParams } = jest.requireMock(
      '../../../../../../util/transaction-controller',
    );

    const legacyTx = {
      id: 'legacy-tx',
      chainId: '0x1',
      txParams: {
        gas: '0x5208',
        gasPrice: '0xBA43B7400',
      },
    } as unknown as TransactionMeta;

    renderWithProvider(<CancelSpeedupModal {...defaultProps} tx={legacyTx} />, {
      state: baseState,
    });

    await waitFor(() => {
      expect(updatePreviousGasParams).toHaveBeenCalled();
    });

    const callArgs = updatePreviousGasParams.mock.calls[0][1];
    expect(Object.keys(callArgs)).toEqual(
      expect.arrayContaining([
        'maxFeePerGas',
        'maxPriorityFeePerGas',
        'gasLimit',
      ]),
    );
  });

  it('calls onConfirm when isInitialGasReady is true', async () => {
    mockedUseCancelSpeedupGas.mockReturnValue({
      ...defaultGasValues,
      isInitialGasReady: true,
    });

    const { getByText } = renderWithProvider(
      <CancelSpeedupModal {...defaultProps} />,
      { state: baseState },
    );

    fireEvent.press(getByText('Confirm'));

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith({
        maxFeePerGas: '0x1',
        maxPriorityFeePerGas: '0x1',
      });
    });
  });

  describe('when transaction is no longer modifiable', () => {
    const notModifiableGasValues = {
      ...defaultGasValues,
      isTransactionModifiable: false,
    };

    it('hides the edit gas icon when isTransactionModifiable is false', () => {
      mockedUseCancelSpeedupGas.mockReturnValue(notModifiableGasValues);

      const { queryByTestId } = renderWithProvider(
        <CancelSpeedupModal {...defaultProps} />,
        { state: baseState },
      );

      expect(queryByTestId('cancel-speedup-edit-gas')).toBeNull();
    });

    it('still calls onConfirm when isTransactionModifiable is false', async () => {
      mockedUseCancelSpeedupGas.mockReturnValue(notModifiableGasValues);

      const { getByText } = renderWithProvider(
        <CancelSpeedupModal {...defaultProps} />,
        { state: baseState },
      );

      fireEvent.press(getByText('Confirm'));

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith(
          notModifiableGasValues.paramsForController,
        );
      });
    });

    it('does not close the parent modal when tx becomes non-modifiable', async () => {
      mockedUseCancelSpeedupGas.mockReturnValue(notModifiableGasValues);

      renderWithProvider(<CancelSpeedupModal {...defaultProps} />, {
        state: baseState,
      });

      await waitFor(() => {
        expect(mockOnClose).not.toHaveBeenCalled();
      });
    });

    it('auto-closes gas modal when tx becomes non-modifiable', async () => {
      mockedUseCancelSpeedupGas.mockReturnValue(defaultGasValues);

      const { getByTestId, queryByTestId, rerender } = renderWithProvider(
        <CancelSpeedupModal {...defaultProps} />,
        { state: baseState },
      );

      fireEvent.press(getByTestId('cancel-speedup-edit-gas'));
      expect(getByTestId('gas-fee-modal')).toBeOnTheScreen();

      mockedUseCancelSpeedupGas.mockReturnValue(notModifiableGasValues);
      rerender(<CancelSpeedupModal {...defaultProps} />);

      await waitFor(() => {
        expect(queryByTestId('gas-fee-modal')).toBeNull();
      });
    });
  });
});
