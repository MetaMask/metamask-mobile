import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import LimitOrderAccountUpgradeFeeInfoSheet from './LimitOrderAccountUpgradeFeeInfoSheet';
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

describe('LimitOrderAccountUpgradeFeeInfoSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the account upgrade fee title and body', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <LimitOrderAccountUpgradeFeeInfoSheet goBack={jest.fn()} />,
    );

    expect(
      getByText(strings('bridge.limit.account_upgrade_fee_info_title')),
    ).toBeOnTheScreen();
    expect(
      getByTestId(LimitOrderAccountUpgradeFeeInfoSheetSelectorsIDs.BODY),
    ).toHaveTextContent(strings('bridge.limit.account_upgrade_fee_info_body'));
  });

  it('goes back when the header close button is pressed', () => {
    const goBack = jest.fn();
    const { getByTestId } = renderWithProvider(
      <LimitOrderAccountUpgradeFeeInfoSheet goBack={goBack} />,
    );

    fireEvent.press(
      getByTestId(
        LimitOrderAccountUpgradeFeeInfoSheetSelectorsIDs.CLOSE_BUTTON,
      ),
    );

    expect(goBack).toHaveBeenCalledTimes(1);
  });
});
