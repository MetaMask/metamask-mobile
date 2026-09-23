import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { CancelLimitOrderModal } from './CancelLimitOrderModal';
import { CancelLimitOrderModalSelectorsIDs } from './testIds';
import type { CancelLimitOrderModalProps } from './types';

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

function buildProps(
  overrides: Partial<CancelLimitOrderModalProps> = {},
): CancelLimitOrderModalProps {
  return {
    onConfirm: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  };
}

describe('CancelOrderModal', () => {
  it('displays the cancellation question', () => {
    const { getByTestId } = render(<CancelLimitOrderModal {...buildProps()} />);

    expect(
      getByTestId(CancelLimitOrderModalSelectorsIDs.DESCRIPTION),
    ).toHaveTextContent(strings('bridge.limit.cancel_order_confirmation'));
  });

  it('fires the onConfirm handler when the confirm button is pressed', () => {
    const onConfirm = jest.fn();
    const { getByTestId } = render(
      <CancelLimitOrderModal {...buildProps({ onConfirm })} />,
    );

    fireEvent.press(getByTestId(CancelLimitOrderModalSelectorsIDs.CONFIRM_BUTTON));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('closes the sheet after the cancellation is confirmed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <CancelLimitOrderModal {...buildProps({ onClose })} />,
    );

    fireEvent.press(getByTestId(CancelLimitOrderModalSelectorsIDs.CONFIRM_BUTTON));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes the sheet without confirming when the close button is pressed', () => {
    const onConfirm = jest.fn();
    const onClose = jest.fn();
    const { getByTestId } = render(
      <CancelLimitOrderModal {...buildProps({ onConfirm, onClose })} />,
    );

    fireEvent.press(getByTestId(CancelLimitOrderModalSelectorsIDs.CLOSE_BUTTON));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
