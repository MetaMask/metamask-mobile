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

function renderScreen(
  bridgeReducerOverrides: NonNullable<
    Parameters<typeof createBridgeTestState>[0]
  >['bridgeReducerOverrides'] = {},
) {
  return renderWithProvider(<LimitOrderCostToleranceInfoSheetScreen />, {
    state: createBridgeTestState({ bridgeReducerOverrides }),
  });
}

describe('LimitOrderCostToleranceInfoSheetScreen', () => {
  it('computes the minimum received percentage from the stored cost tolerance', () => {
    const { getByTestId } = renderScreen({ limitOrderCostTolerance: '0.5' });

    expect(
      getByTestId(LimitOrderCostToleranceInfoSheetSelectorsIDs.BODY),
    ).toHaveTextContent(
      strings('bridge.cost_tolerance_tooltip_content', {
        minReceivedPercentage: 99.5,
      }),
    );
  });

  it('falls back to the default cost tolerance when none is stored', () => {
    const { getByTestId } = renderScreen({
      limitOrderCostTolerance: undefined,
    });

    expect(
      getByTestId(LimitOrderCostToleranceInfoSheetSelectorsIDs.BODY),
    ).toHaveTextContent(
      strings('bridge.cost_tolerance_tooltip_content', {
        minReceivedPercentage: 98,
      }),
    );
  });
});
