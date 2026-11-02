import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Logger from '../../../../../util/Logger';
import {
  LIMIT_ORDER_DEFAULT_METAMASK_FEE,
  LIMIT_ORDER_METAMASK_FEE_LEARN_MORE_URL,
} from '../../constants/limitOrders';
import LimitOrderMetaMaskFeeInfoSheet from './LimitOrderMetaMaskFeeInfoSheet';
import { LimitOrderMetaMaskFeeInfoSheetSelectorsIDs } from './LimitOrderMetaMaskFeeInfoSheet.testIds';

jest.mock('../../../../../util/Logger', () => ({
  error: jest.fn(),
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
          goBack?: () => void;
        },
        ref: React.Ref<{ onCloseBottomSheet: () => void }>,
      ) => {
        ReactModule.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: () => props.goBack?.(),
        }));

        return (
          <View testID={props.testID}>{props.children as React.ReactNode}</View>
        );
      },
    ),
  };
});

describe('LimitOrderMetaMaskFeeInfoSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the MetaMask fee title and body with the default fee', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <LimitOrderMetaMaskFeeInfoSheet goBack={jest.fn()} />,
    );

    expect(
      getByText(strings('bridge.limit.metamask_fee_info_title')),
    ).toBeOnTheScreen();
    expect(
      getByTestId(LimitOrderMetaMaskFeeInfoSheetSelectorsIDs.BODY),
    ).toHaveTextContent(
      strings('bridge.limit.metamask_fee_info_body', {
        feePercentage: LIMIT_ORDER_DEFAULT_METAMASK_FEE,
      }),
    );
  });

  it('opens the learn more URL when learn more is pressed', async () => {
    const openURLSpy = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValueOnce(true);
    const { getByTestId } = renderWithProvider(
      <LimitOrderMetaMaskFeeInfoSheet goBack={jest.fn()} />,
    );

    fireEvent.press(
      getByTestId(LimitOrderMetaMaskFeeInfoSheetSelectorsIDs.LEARN_MORE),
    );

    await waitFor(() =>
      expect(openURLSpy).toHaveBeenCalledWith(
        LIMIT_ORDER_METAMASK_FEE_LEARN_MORE_URL,
      ),
    );
  });

  it('logs an error when the learn more URL fails to open', async () => {
    const error = new Error('cannot open');
    jest.spyOn(Linking, 'openURL').mockRejectedValueOnce(error);
    const { getByTestId } = renderWithProvider(
      <LimitOrderMetaMaskFeeInfoSheet goBack={jest.fn()} />,
    );

    fireEvent.press(
      getByTestId(LimitOrderMetaMaskFeeInfoSheetSelectorsIDs.LEARN_MORE),
    );

    await waitFor(() =>
      expect(Logger.error).toHaveBeenCalledWith(error, expect.any(Object)),
    );
  });

  it('goes back when the got it button is pressed', () => {
    const goBack = jest.fn();
    const { getByTestId } = renderWithProvider(
      <LimitOrderMetaMaskFeeInfoSheet goBack={goBack} />,
    );

    fireEvent.press(
      getByTestId(LimitOrderMetaMaskFeeInfoSheetSelectorsIDs.GOT_IT_BUTTON),
    );

    expect(goBack).toHaveBeenCalledTimes(1);
  });

  it('goes back when the header close button is pressed', () => {
    const goBack = jest.fn();
    const { getByTestId } = renderWithProvider(
      <LimitOrderMetaMaskFeeInfoSheet goBack={goBack} />,
    );

    fireEvent.press(
      getByTestId(LimitOrderMetaMaskFeeInfoSheetSelectorsIDs.CLOSE_BUTTON),
    );

    expect(goBack).toHaveBeenCalledTimes(1);
  });
});
