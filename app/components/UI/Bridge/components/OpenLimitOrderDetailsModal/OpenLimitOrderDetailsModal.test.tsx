import React from 'react';
import { fireEvent, render, within } from '@testing-library/react-native';
import { Hex } from '@metamask/utils';
import { strings } from '../../../../../../locales/i18n';
import { OpenLimitOrderDetailsModal } from './OpenLimitOrderDetailsModal';
import { OpenLimitOrderDetailsModalSelectorsIDs } from './testIds';
import type { OpenLimitOrderDetailsModalProps } from './types';

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
  address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
  chainId: '0x1' as Hex,
  decimals: 8,
  image: '',
  name: 'Wrapped Bitcoin',
  symbol: 'WBTC',
};

function buildProps(
  overrides: Partial<OpenLimitOrderDetailsModalProps> = {},
): OpenLimitOrderDetailsModalProps {
  return {
    sourceToken: mockSourceToken,
    destToken: mockDestToken,
    status: 'In progress',
    submittedAmount: '0.1 ETH',
    triggerPrice: '@ $3,412.20',
    triggerToken: mockDestToken,
    expiry: '7 days',
    onCancelOrder: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  };
}

describe('OpenOrderDetailsModal', () => {
  it('displays the traded pair as the sheet title', () => {
    const { getByText } = render(<OpenLimitOrderDetailsModal {...buildProps()} />);

    expect(
      getByText(strings('bridge.limit.pair', { source: 'ETH', dest: 'WBTC' })),
    ).toBeOnTheScreen();
  });

  it('displays the order status', () => {
    const { getByTestId } = render(
      <OpenLimitOrderDetailsModal {...buildProps({ status: 'In progress' })} />,
    );

    const statusRow = getByTestId(OpenLimitOrderDetailsModalSelectorsIDs.STATUS);

    expect(within(statusRow).getByText('In progress')).toBeOnTheScreen();
  });

  it('displays the submitted amount', () => {
    const { getByTestId } = render(
      <OpenLimitOrderDetailsModal {...buildProps({ submittedAmount: '0.1 ETH' })} />,
    );

    const submittedRow = getByTestId(
      OpenLimitOrderDetailsModalSelectorsIDs.SUBMITTED,
    );

    expect(within(submittedRow).getByText('0.1 ETH')).toBeOnTheScreen();
  });

  it('displays the trigger price', () => {
    const { getByTestId } = render(
      <OpenLimitOrderDetailsModal
        {...buildProps({ triggerPrice: '@ $3,412.20' })}
      />,
    );

    const triggerRow = getByTestId(
      OpenLimitOrderDetailsModalSelectorsIDs.TRIGGER_CONDITION,
    );

    expect(within(triggerRow).getByText('@ $3,412.20')).toBeOnTheScreen();
  });

  it('displays the expiry', () => {
    const { getByTestId } = render(
      <OpenLimitOrderDetailsModal {...buildProps({ expiry: '7 days' })} />,
    );

    const expiryRow = getByTestId(OpenLimitOrderDetailsModalSelectorsIDs.EXPIRY);

    expect(within(expiryRow).getByText('7 days')).toBeOnTheScreen();
  });

  it('omits the market comparison when there is none to show', () => {
    const { queryByTestId } = render(
      <OpenLimitOrderDetailsModal
        {...buildProps({ triggerComparison: undefined })}
      />,
    );

    expect(
      queryByTestId(OpenLimitOrderDetailsModalSelectorsIDs.TRIGGER_COMPARISON),
    ).toBeNull();
  });

  it('displays the market comparison under the trigger price', () => {
    const { getByTestId } = render(
      <OpenLimitOrderDetailsModal
        {...buildProps({
          triggerComparison: {
            label: '(-4.95% from market)',
            isNegative: true,
          },
        })}
      />,
    );

    expect(
      getByTestId(OpenLimitOrderDetailsModalSelectorsIDs.TRIGGER_COMPARISON),
    ).toHaveTextContent('(-4.95% from market)');
  });

  it('fires the cancel order handler when the cancel button is pressed', () => {
    const onCancelOrder = jest.fn();
    const { getByTestId } = render(
      <OpenLimitOrderDetailsModal {...buildProps({ onCancelOrder })} />,
    );

    fireEvent.press(
      getByTestId(OpenLimitOrderDetailsModalSelectorsIDs.CANCEL_ORDER_BUTTON),
    );

    expect(onCancelOrder).toHaveBeenCalledTimes(1);
  });

  it('closes the sheet when the close button is pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <OpenLimitOrderDetailsModal {...buildProps({ onClose })} />,
    );

    fireEvent.press(
      getByTestId(OpenLimitOrderDetailsModalSelectorsIDs.CLOSE_BUTTON),
    );

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
