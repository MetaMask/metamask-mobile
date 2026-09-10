import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import RecurringDelegationFeeInfoSheet from './RecurringDelegationFeeInfoSheet';
import { RecurringDelegationFeeInfoSheetSelectorsIDs } from './RecurringDelegationFeeInfoSheet.testIds';

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

describe('RecurringDelegationFeeInfoSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the placeholder body', () => {
    const { getByTestId } = renderWithProvider(
      <RecurringDelegationFeeInfoSheet goBack={jest.fn()} />,
    );

    expect(
      getByTestId(RecurringDelegationFeeInfoSheetSelectorsIDs.BODY),
    ).toHaveTextContent(strings('bridge.recurring.delegation_fee_info_body'));
  });

  it('goes back when the header close is pressed', () => {
    const goBack = jest.fn();
    const { getByTestId } = renderWithProvider(
      <RecurringDelegationFeeInfoSheet goBack={goBack} />,
    );

    fireEvent.press(
      getByTestId(RecurringDelegationFeeInfoSheetSelectorsIDs.CLOSE_BUTTON),
    );

    expect(goBack).toHaveBeenCalledTimes(1);
  });

  it('goes back when Got it is pressed', () => {
    const goBack = jest.fn();
    const { getByTestId } = renderWithProvider(
      <RecurringDelegationFeeInfoSheet goBack={goBack} />,
    );

    fireEvent.press(
      getByTestId(RecurringDelegationFeeInfoSheetSelectorsIDs.GOT_IT_BUTTON),
    );

    expect(goBack).toHaveBeenCalledTimes(1);
  });
});
