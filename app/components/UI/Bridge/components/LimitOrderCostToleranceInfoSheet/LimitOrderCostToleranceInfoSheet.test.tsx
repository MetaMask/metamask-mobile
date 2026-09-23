import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import LimitOrderCostToleranceInfoSheet from './LimitOrderCostToleranceInfoSheet';
import { LimitOrderCostToleranceInfoSheetSelectorsIDs } from './LimitOrderCostToleranceInfoSheet.testIds';

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

describe('LimitOrderCostToleranceInfoSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the cost tolerance body with the minimum received percentage', () => {
    const { getByTestId } = renderWithProvider(
      <LimitOrderCostToleranceInfoSheet
        minReceivedPercentage={98}
        goBack={jest.fn()}
      />,
    );

    expect(
      getByTestId(LimitOrderCostToleranceInfoSheetSelectorsIDs.BODY),
    ).toHaveTextContent(
      strings('bridge.cost_tolerance_tooltip_content', {
        minReceivedPercentage: 98,
      }),
    );
  });

  it('goes back when the header close button is pressed', () => {
    const goBack = jest.fn();
    const { getByTestId } = renderWithProvider(
      <LimitOrderCostToleranceInfoSheet
        minReceivedPercentage={98}
        goBack={goBack}
      />,
    );

    fireEvent.press(
      getByTestId(LimitOrderCostToleranceInfoSheetSelectorsIDs.CLOSE_BUTTON),
    );

    expect(goBack).toHaveBeenCalledTimes(1);
  });
});
