import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  SWAPS_LIMIT_ORDER_DEFAULT_EXPIRATION_MINUTES,
  SWAPS_LIMIT_ORDER_EXPIRATION_OPTIONS_MINUTES,
  getSwapsLimitOrderExpirationLabel,
} from '../../constants/limitOrders';
import SwapsLimitOrderExpirationModal from './SwapsLimitOrderExpirationModal';
import { SwapsLimitOrderExpirationModalSelectorsIDs } from './testIds';
import type { SwapsLimitOrderExpirationModalProps } from './types';

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactModule = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return {
    ...actual,
    BottomSheet: ReactModule.forwardRef(
      (
        {
          children,
          onClose,
          testID,
        }: {
          children?: React.ReactNode;
          onClose?: () => void;
          testID?: string;
        },
        ref: React.Ref<{
          onCloseBottomSheet: (callback?: () => void) => void;
        }>,
      ) => {
        ReactModule.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: (callback?: () => void) => {
            callback?.();
            onClose?.();
          },
        }));

        return <View testID={testID}>{children}</View>;
      },
    ),
  };
});

const renderModal = (
  overrides: Partial<SwapsLimitOrderExpirationModalProps> = {},
) => {
  const props: SwapsLimitOrderExpirationModalProps = {
    selectedMinutes: SWAPS_LIMIT_ORDER_DEFAULT_EXPIRATION_MINUTES,
    onSelect: jest.fn(),
    onConfirm: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  };

  return {
    ...render(<SwapsLimitOrderExpirationModal {...props} />),
    props,
  };
};

describe('SwapsLimitOrderExpirationModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the title, options, and confirm button', () => {
    const { getByTestId, getByText } = renderModal();

    expect(
      getByTestId(SwapsLimitOrderExpirationModalSelectorsIDs.SHEET),
    ).toBeOnTheScreen();
    expect(getByText(strings('bridge.limit.expiration'))).toBeOnTheScreen();
    expect(
      getByTestId(SwapsLimitOrderExpirationModalSelectorsIDs.CONFIRM_BUTTON),
    ).toBeOnTheScreen();

    SWAPS_LIMIT_ORDER_EXPIRATION_OPTIONS_MINUTES.forEach((minutes) => {
      expect(
        getByTestId(SwapsLimitOrderExpirationModalSelectorsIDs.OPTION(minutes)),
      ).toBeOnTheScreen();
      expect(
        getByText(getSwapsLimitOrderExpirationLabel(minutes)),
      ).toBeOnTheScreen();
    });
  });

  it('calls onSelect with the option minutes when an option is pressed', () => {
    const { getByTestId, props } = renderModal();

    fireEvent.press(
      getByTestId(SwapsLimitOrderExpirationModalSelectorsIDs.OPTION(10080)),
    );

    expect(props.onSelect).toHaveBeenCalledTimes(1);
    expect(props.onSelect).toHaveBeenCalledWith(10080);
  });

  it('calls onConfirm with the selected minutes when confirm is pressed', () => {
    const { getByTestId, props } = renderModal({
      selectedMinutes: 10080,
    });

    fireEvent.press(
      getByTestId(SwapsLimitOrderExpirationModalSelectorsIDs.CONFIRM_BUTTON),
    );

    expect(props.onConfirm).toHaveBeenCalledTimes(1);
    expect(props.onConfirm).toHaveBeenCalledWith(10080);
  });

  it('calls onClose when the close button is pressed', () => {
    const { getByTestId, props } = renderModal();

    fireEvent.press(
      getByTestId(SwapsLimitOrderExpirationModalSelectorsIDs.CLOSE_BUTTON),
    );

    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose after confirm closes the sheet', () => {
    const { getByTestId, props } = renderModal();

    fireEvent.press(
      getByTestId(SwapsLimitOrderExpirationModalSelectorsIDs.CONFIRM_BUTTON),
    );

    expect(props.onConfirm).toHaveBeenCalledTimes(1);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});
