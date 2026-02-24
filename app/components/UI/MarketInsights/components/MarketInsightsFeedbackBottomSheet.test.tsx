import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import MarketInsightsFeedbackBottomSheet, {
  MarketInsightsFeedbackReason,
} from './MarketInsightsFeedbackBottomSheet';
import { MarketInsightsSelectorsIDs } from '../MarketInsights.testIds';

jest.mock(
  '../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const ReactLib = jest.requireActual('react');
    const { View: MockView } = jest.requireActual('react-native');

    return ReactLib.forwardRef(
      (
        { children }: { children: React.ReactNode },
        ref: React.Ref<{
          onOpenBottomSheet: () => void;
          onCloseBottomSheet: () => void;
        }>,
      ) => {
        ReactLib.useImperativeHandle(ref, () => ({
          onOpenBottomSheet: jest.fn(),
          onCloseBottomSheet: jest.fn(),
        }));
        return <MockView testID="mock-bottom-sheet">{children}</MockView>;
      },
    );
  },
);

jest.mock(
  '../../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => {
    const { View: MockView } = jest.requireActual('react-native');
    return ({ children }: { children: React.ReactNode }) => (
      <MockView testID="mock-bottom-sheet-header">{children}</MockView>
    );
  },
);

describe('MarketInsightsFeedbackBottomSheet', () => {
  it('submits selected reason without additional feedback', () => {
    const onSubmit = jest.fn();

    const { getByTestId } = renderWithProvider(
      <MarketInsightsFeedbackBottomSheet
        isVisible
        onClose={jest.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.press(
      getByTestId(MarketInsightsSelectorsIDs.FEEDBACK_OPTION_NOT_RELEVANT),
    );
    fireEvent.press(
      getByTestId(MarketInsightsSelectorsIDs.FEEDBACK_SUBMIT_BUTTON),
    );

    expect(onSubmit).toHaveBeenCalledWith({
      reason: MarketInsightsFeedbackReason.NotRelevant,
    });
  });

  it('reveals additional feedback input for "something else" and includes text', () => {
    const onSubmit = jest.fn();

    const { getByTestId } = renderWithProvider(
      <MarketInsightsFeedbackBottomSheet
        isVisible
        onClose={jest.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.press(
      getByTestId(MarketInsightsSelectorsIDs.FEEDBACK_OPTION_SOMETHING_ELSE),
    );

    fireEvent.changeText(
      getByTestId(MarketInsightsSelectorsIDs.FEEDBACK_ADDITIONAL_INPUT),
      '  Please include source confidence  ',
    );
    fireEvent.press(
      getByTestId(MarketInsightsSelectorsIDs.FEEDBACK_SUBMIT_BUTTON),
    );

    expect(onSubmit).toHaveBeenCalledWith({
      reason: MarketInsightsFeedbackReason.SomethingElse,
      feedbackText: 'Please include source confidence',
    });
  });
});
