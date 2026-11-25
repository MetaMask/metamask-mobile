import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { LIMIT_ORDER_DEFAULT_METAMASK_FEE } from '../../constants/limitOrders';
import { createBridgeTestState } from '../../testUtils';
import { LimitOrderMetaMaskFeeInfoSheetScreen } from './LimitOrderMetaMaskFeeInfoSheetScreen';
import { LimitOrderMetaMaskFeeInfoSheetSelectorsIDs } from './LimitOrderMetaMaskFeeInfoSheet.testIds';

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

describe('LimitOrderMetaMaskFeeInfoSheetScreen', () => {
  it('renders the MetaMask fee body', () => {
    const { getByTestId } = renderWithProvider(
      <LimitOrderMetaMaskFeeInfoSheetScreen />,
      { state: createBridgeTestState() },
    );

    expect(
      getByTestId(LimitOrderMetaMaskFeeInfoSheetSelectorsIDs.BODY),
    ).toHaveTextContent(
      strings('bridge.limit.metamask_fee_info_body', {
        feePercentage: LIMIT_ORDER_DEFAULT_METAMASK_FEE,
      }),
    );
  });
});
