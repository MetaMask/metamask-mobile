import React from 'react';
import { render } from '@testing-library/react-native';
import { Hex } from '@metamask/utils';
import { LimitOrderConfirmationModal } from './LimitOrderConfirmationModal';
import type { LimitOrderConfirmationModalProps } from './types';

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactModule = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return {
    ...actual,
    BottomSheet: ReactModule.forwardRef(
      (
        props: {
          children: unknown;
          testID?: string;
          onClose?: () => void;
        },
        ref: React.Ref<{ onCloseBottomSheet: () => void }>,
      ) => {
        ReactModule.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: () => props.onClose?.(),
        }));

        return (
          <View testID={props.testID}>{props.children as React.ReactNode}</View>
        );
      },
    ),
  };
});

const mockSourceToken = {
  address: '0x0000000000000000000000000000000000000000',
  chainId: '0x1' as Hex,
  decimals: 18,
  image: '',
  name: 'Ether',
  symbol: 'ETH',
};

const mockDestToken = {
  address: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
  chainId: '0xa' as Hex,
  decimals: 6,
  image: '',
  name: 'USD Coin',
  symbol: 'USDC',
};

function buildProps(
  overrides: Partial<LimitOrderConfirmationModalProps> = {},
): LimitOrderConfirmationModalProps {
  return {
    sourceToken: mockSourceToken,
    destToken: mockDestToken,
    payingAmount: '0.1 ETH',
    triggerPrice: '$3,412.20',
    expiry: '7 days',
    slippage: '2%',
    networkFee: '$1.69',
    feeToken: mockSourceToken,
    onConfirm: jest.fn(),
    onEditSlippagePress: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  };
}

describe('LimitOrderConfirmationModal', () => {
  it('does not close when re-rendered with the same slippage', () => {
    const onClose = jest.fn();
    const props = buildProps({ slippage: '2%', onClose });
    const { rerender } = render(<LimitOrderConfirmationModal {...props} />);

    rerender(<LimitOrderConfirmationModal {...props} slippage="2%" />);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes the sheet when the slippage changes after mount', () => {
    const onClose = jest.fn();
    const props = buildProps({ slippage: '2%', onClose });
    const { rerender } = render(<LimitOrderConfirmationModal {...props} />);

    expect(onClose).not.toHaveBeenCalled();

    rerender(<LimitOrderConfirmationModal {...props} slippage="0.5%" />);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
