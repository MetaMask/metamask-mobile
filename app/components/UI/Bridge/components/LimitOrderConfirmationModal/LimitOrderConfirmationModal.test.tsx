import React from 'react';
import { fireEvent, render, within } from '@testing-library/react-native';
import { Hex } from '@metamask/utils';
import { LimitOrderConfirmationModal } from './LimitOrderConfirmationModal';
import { LimitOrderConfirmationModalSelectorsIDs } from './testIds';
import type { LimitOrderConfirmationModalProps } from './types';
import { LIMIT_ORDER_DEFAULT_METAMASK_FEE } from '../../constants/limitOrders';
import Routes from '../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

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
    costTolerance: '2%',
    delegationFee: {
      status: 'ready',
      displayFee: '$1.69',
      preciseNativeFeeInHex: '0x1',
      retry: jest.fn(),
    },
    feeToken: mockSourceToken,
    primaryButton: {
      onPress: jest.fn(),
      label: 'Confirm order',
    },
    onClose: jest.fn(),
    ...overrides,
  };
}

describe('LimitOrderConfirmationModal', () => {
  it('does not close when re-rendered with the same cost tolerance', () => {
    const onClose = jest.fn();
    const props = buildProps({ costTolerance: '2%', onClose });
    const { rerender } = render(<LimitOrderConfirmationModal {...props} />);

    rerender(<LimitOrderConfirmationModal {...props} costTolerance="2%" />);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes the sheet when the cost tolerance changes after mount', () => {
    const onClose = jest.fn();
    const props = buildProps({ costTolerance: '2%', onClose });
    const { rerender } = render(<LimitOrderConfirmationModal {...props} />);

    expect(onClose).not.toHaveBeenCalled();

    rerender(<LimitOrderConfirmationModal {...props} costTolerance="0.5%" />);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('displays the account upgrade fee as the estimated network fee', () => {
    const { getByTestId } = render(
      <LimitOrderConfirmationModal
        {...buildProps({
          delegationFee: {
            status: 'ready',
            displayFee: '$1.69',
            preciseNativeFeeInHex: '0x1',
            retry: jest.fn(),
          },
        })}
      />,
    );

    const networkFeeRow = getByTestId(
      LimitOrderConfirmationModalSelectorsIDs.NETWORK_FEE,
    );

    expect(within(networkFeeRow).getByText('$1.69')).toBeOnTheScreen();
  });

  it('omits the network fee row while the upgrade fee is being estimated', () => {
    const { queryByTestId } = render(
      <LimitOrderConfirmationModal
        {...buildProps({
          delegationFee: { status: 'loading', retry: jest.fn() },
        })}
      />,
    );

    expect(
      queryByTestId(LimitOrderConfirmationModalSelectorsIDs.NETWORK_FEE),
    ).toBeNull();
  });

  it('displays a placeholder when the upgrade fee cannot be estimated', () => {
    const { getByTestId } = render(
      <LimitOrderConfirmationModal
        {...buildProps({
          delegationFee: { status: 'error', retry: jest.fn() },
        })}
      />,
    );

    const networkFeeRow = getByTestId(
      LimitOrderConfirmationModalSelectorsIDs.NETWORK_FEE,
    );

    expect(within(networkFeeRow).getByText('--')).toBeOnTheScreen();
  });

  // An already delegated account pays nothing to place the order, so there is
  // no fee to show at all.
  it('omits the network fee row when the account is already delegated', () => {
    const { queryByTestId } = render(
      <LimitOrderConfirmationModal
        {...buildProps({
          delegationFee: { status: 'not-required', retry: jest.fn() },
        })}
      />,
    );

    expect(
      queryByTestId(LimitOrderConfirmationModalSelectorsIDs.NETWORK_FEE),
    ).toBeNull();
  });

  it('does not display an error banner by default', () => {
    const { queryByText } = render(
      <LimitOrderConfirmationModal {...buildProps()} />,
    );

    expect(queryByText('Something went wrong')).toBeNull();
  });

  it('displays an error banner when an error message is provided', () => {
    const { getByText } = render(
      <LimitOrderConfirmationModal
        {...buildProps({ error: 'Something went wrong' })}
      />,
    );

    expect(getByText('Something went wrong')).toBeOnTheScreen();
  });

  it('does not display the USD price notice without a USD trigger price', () => {
    const { queryByTestId } = render(
      <LimitOrderConfirmationModal {...buildProps()} />,
    );

    expect(
      queryByTestId(LimitOrderConfirmationModalSelectorsIDs.USD_PRICE_NOTICE),
    ).toBeNull();
  });

  it('displays the USD price notice with the USD trigger price', () => {
    const { getByTestId } = render(
      <LimitOrderConfirmationModal
        {...buildProps({ usdTriggerPrice: '$3,412.2' })}
      />,
    );

    expect(
      getByTestId(LimitOrderConfirmationModalSelectorsIDs.USD_PRICE_NOTICE),
    ).toHaveTextContent(
      'For display purposes you see the values in your selected currency but the actual order will be logged based on the USD exchange rate (~$3,412.2)',
    );
  });

  it('fires the primary button onPress handler when pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <LimitOrderConfirmationModal
        {...buildProps({ primaryButton: { onPress, label: 'Confirm order' } })}
      />,
    );

    fireEvent.press(
      getByTestId(LimitOrderConfirmationModalSelectorsIDs.PRIMARY_BUTTON),
    );

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('displays the primary button label from props', () => {
    const { getByText } = render(
      <LimitOrderConfirmationModal
        {...buildProps({
          primaryButton: { onPress: jest.fn(), label: 'Try again' },
        })}
      />,
    );

    expect(getByText('Try again')).toBeOnTheScreen();
  });

  it('opens the cost tolerance tooltip when the info button is pressed', () => {
    const { getByTestId } = render(
      <LimitOrderConfirmationModal {...buildProps({ costTolerance: '2%' })} />,
    );

    fireEvent.press(
      getByTestId(
        LimitOrderConfirmationModalSelectorsIDs.COST_TOLERANCE_TOOLTIP,
      ),
    );

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.LIMIT_ORDER_COST_TOLERANCE_INFO_MODAL,
    });
  });

  it('displays the fee disclaimer with the default MetaMask fee percentage', () => {
    const { getByTestId } = render(
      <LimitOrderConfirmationModal {...buildProps()} />,
    );

    expect(
      getByTestId(LimitOrderConfirmationModalSelectorsIDs.FEE_DISCLAIMER),
    ).toHaveTextContent(
      new RegExp(`${LIMIT_ORDER_DEFAULT_METAMASK_FEE}% MetaMask fee`),
    );
  });
});
