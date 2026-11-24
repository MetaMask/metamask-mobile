import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { createBridgeTestState } from '../../testUtils';
import { LimitOrderAccountUpgradeFeeInfoSheetScreen } from './LimitOrderAccountUpgradeFeeInfoSheetScreen';
import { LimitOrderAccountUpgradeFeeInfoSheetSelectorsIDs } from './LimitOrderAccountUpgradeFeeInfoSheet.testIds';

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

describe('LimitOrderAccountUpgradeFeeInfoSheetScreen', () => {
  it('renders the account upgrade fee body', () => {
    const { getByTestId } = renderWithProvider(
      <LimitOrderAccountUpgradeFeeInfoSheetScreen />,
      { state: createBridgeTestState() },
    );

    expect(
      getByTestId(LimitOrderAccountUpgradeFeeInfoSheetSelectorsIDs.BODY),
    ).toHaveTextContent(strings('bridge.limit.account_upgrade_fee_info_body'));
  });
});
