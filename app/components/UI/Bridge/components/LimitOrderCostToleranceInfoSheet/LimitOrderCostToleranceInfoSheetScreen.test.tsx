import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { createBridgeTestState } from '../../testUtils';
import { LimitOrderCostToleranceInfoSheetScreen } from './LimitOrderCostToleranceInfoSheetScreen';
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

describe('LimitOrderCostToleranceInfoSheetScreen', () => {
  it('renders the price tolerance tooltip content', () => {
    const { getByTestId } = renderWithProvider(
      <LimitOrderCostToleranceInfoSheetScreen />,
      { state: createBridgeTestState() },
    );

    expect(
      getByTestId(LimitOrderCostToleranceInfoSheetSelectorsIDs.BODY),
    ).toHaveTextContent(strings('bridge.cost_tolerance_tooltip_content'));
  });
});
