import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { CancelSpeedupModal } from './cancel-speedup-modal';
import { backgroundState } from '../../../../../../util/test/initial-root-state';

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
              void Promise.resolve(callback?.()).then(() => {});
            },
            onOpenBottomSheet: () => undefined,
          }));
          return RN.createElement(RN.Fragment, null, props.children);
        },
      ),
    };
  },
);

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

jest.mock('../../../hooks/gas/useCancelSpeedupGas', () => ({
  useCancelSpeedupGas: () => ({
    paramsForController: { maxFeePerGas: '0x1', maxPriorityFeePerGas: '0x1' },
    networkFeeDisplay: '0.001 ETH',
    networkFeeNative: '0.001',
    networkFeeFiat: null,
    speedDisplay: 'Market ~ 15 sec',
    nativeTokenSymbol: 'ETH',
  }),
}));

describe('CancelSpeedupModal', () => {
  const mockOnConfirm = jest.fn();
  const mockOnClose = jest.fn();
  const defaultProps = {
    isCancel: false,
    tx: { id: 'tx-1', chainId: '0x1', txParams: { gas: '0x5208' } } as any,
    existingGas: { isEIP1559Transaction: true, maxFeePerGas: 20, maxPriorityFeePerGas: 2 } as any,
    onConfirm: mockOnConfirm,
    onClose: mockOnClose,
    confirmDisabled: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders speed up title when isCancel is false', () => {
    const { getByText } = renderWithProvider(
      <CancelSpeedupModal {...defaultProps} />,
      { state: baseState },
    );
    expect(getByText('Speed up Transaction')).toBeDefined();
  });

  it('renders cancel title when isCancel is true', () => {
    const { getByText } = renderWithProvider(
      <CancelSpeedupModal {...defaultProps} isCancel />,
      { state: baseState },
    );
    expect(getByText('Cancel Transaction')).toBeDefined();
  });

  it('renders Network fee and Speed rows', () => {
    const { getByText } = renderWithProvider(
      <CancelSpeedupModal {...defaultProps} />,
      { state: baseState },
    );
    expect(getByText('Network fee')).toBeDefined();
    expect(getByText('Speed')).toBeDefined();
    expect(getByText('0.001')).toBeDefined();
    expect(getByText('ETH')).toBeDefined();
    expect(getByText('Market ~ 15 sec')).toBeDefined();
  });

  it('calls onConfirm with params when Confirm is pressed', () => {
    const { getByText } = renderWithProvider(
      <CancelSpeedupModal {...defaultProps} />,
      { state: baseState },
    );
    fireEvent.press(getByText('Confirm'));
    expect(mockOnConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        maxFeePerGas: '0x1',
        maxPriorityFeePerGas: '0x1',
      }),
    );
  });
});
