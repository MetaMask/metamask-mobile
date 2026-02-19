import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { TransactionMeta } from '@metamask/transaction-controller';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { CancelSpeedupModal } from './cancel-speedup-modal';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { useCancelSpeedupGas } from '../../../hooks/gas/useCancelSpeedupGas';

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
  speedDisplay: 'Market ~ 15 sec',
  nativeTokenSymbol: 'ETH',
};

jest.mock('../../../hooks/gas/useCancelSpeedupGas', () => ({
  useCancelSpeedupGas: jest.fn(),
}));

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
    isCancel: false,
    tx: {
      id: 'tx-1',
      chainId: '0x1',
      txParams: { gas: '0x5208' },
    } as unknown as TransactionMeta,
    existingGas: {
      isEIP1559Transaction: true,
      maxFeePerGas: '0x1',
      maxPriorityFeePerGas: '0x1',
    },
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

    expect(getByText('Speed up Transaction')).toBeTruthy();
    expect(
      getByText('This network fee will replace the original.'),
    ).toBeTruthy();
    expect(getByText('Network fee')).toBeTruthy();
    expect(getByText('Speed')).toBeTruthy();
    expect(getByText('0.001')).toBeTruthy();
    expect(getByText('ETH')).toBeTruthy();
    expect(getByText('$1.80')).toBeTruthy();
    expect(getByText('Market ~ 15 sec')).toBeTruthy();
    expect(getByText('Confirm')).toBeTruthy();
  });

  it('renders cancel modal with correct content', () => {
    const { getByText } = renderWithProvider(
      <CancelSpeedupModal {...defaultProps} isCancel />,
      { state: baseState },
    );

    expect(getByText('Cancel Transaction')).toBeTruthy();
    expect(
      getByText(
        'This transaction will be canceled and this network fee will replace the original.',
      ),
    ).toBeTruthy();
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
      existingGas: defaultProps.existingGas,
      tx: defaultProps.tx,
      isCancel: false,
    });
  });

  it('handles null tx and existingGas gracefully', () => {
    const { getByText } = renderWithProvider(
      <CancelSpeedupModal {...defaultProps} tx={null} existingGas={null} />,
      { state: baseState },
    );

    expect(getByText('Speed up Transaction')).toBeTruthy();
    expect(getByText('Network fee')).toBeTruthy();
  });
});
