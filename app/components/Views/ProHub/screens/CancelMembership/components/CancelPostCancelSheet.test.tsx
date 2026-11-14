import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import CancelPostCancelSheet from './CancelPostCancelSheet';
import { CancelMembershipTestIds } from '../CancelMembership.testIds';
import { CANCELLATION_TIMINGS } from '../CancelMembership.utils';
import { strings } from '../../../../../../../locales/i18n';

const mockBottomSheetProps = jest.fn();

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const { View: MockView } = jest.requireActual('react-native');
  return {
    ...actual,
    // Captures the props the sheet passes so the non-dismissable contract can
    // be asserted. Renders children so the content is queryable.
    BottomSheet: (props: { children: React.ReactNode; testID?: string }) => {
      mockBottomSheetProps(props);
      return <MockView testID={props.testID}>{props.children}</MockView>;
    },
  };
});

const renderSheet = (
  overrides: Partial<React.ComponentProps<typeof CancelPostCancelSheet>> = {},
) => {
  const onConfirm = jest.fn();
  const utils = render(
    <CancelPostCancelSheet
      timing={CANCELLATION_TIMINGS.PERIOD_END}
      periodEndDate="Jul 20, 2027"
      onConfirm={onConfirm}
      {...overrides}
    />,
  );
  return { ...utils, onConfirm };
};

describe('CancelPostCancelSheet', () => {
  beforeEach(() => {
    mockBottomSheetProps.mockClear();
  });

  it('is not interactable so overlay, swipe, and Android back cannot dismiss it', () => {
    renderSheet();

    expect(mockBottomSheetProps).toHaveBeenCalledWith(
      expect.objectContaining({ isInteractable: false }),
    );
  });

  it('does not pass a goBack handler, so nothing dismisses the sheet by navigating away', () => {
    renderSheet();

    expect(mockBottomSheetProps.mock.calls[0][0].goBack).toBeUndefined();
  });

  it('shows the period-end copy with the renewal date', () => {
    const { getByTestId } = renderSheet({
      timing: CANCELLATION_TIMINGS.PERIOD_END,
      periodEndDate: 'Jul 20, 2027',
    });

    expect(
      getByTestId(CancelMembershipTestIds.POST_CANCEL_SHEET_DESCRIPTION),
    ).toHaveTextContent(
      strings(
        'pro_hub.cancel_membership.post_cancel_sheet.period_end_description',
        { date: 'Jul 20, 2027' },
      ),
    );
  });

  it('falls back to period-end copy without a date when the date is unavailable', () => {
    const { getByTestId } = renderSheet({
      timing: CANCELLATION_TIMINGS.PERIOD_END,
      periodEndDate: undefined,
    });

    expect(
      getByTestId(CancelMembershipTestIds.POST_CANCEL_SHEET_DESCRIPTION),
    ).toHaveTextContent(
      strings(
        'pro_hub.cancel_membership.post_cancel_sheet.period_end_description_no_date',
      ),
    );
  });

  it('shows the immediate copy and ignores any date for an immediate cancellation', () => {
    const { getByTestId } = renderSheet({
      timing: CANCELLATION_TIMINGS.IMMEDIATE,
      periodEndDate: 'Jul 20, 2027',
    });

    expect(
      getByTestId(CancelMembershipTestIds.POST_CANCEL_SHEET_TITLE),
    ).toHaveTextContent(
      strings('pro_hub.cancel_membership.post_cancel_sheet.immediate_title'),
    );
    expect(
      getByTestId(CancelMembershipTestIds.POST_CANCEL_SHEET_DESCRIPTION),
    ).not.toHaveTextContent('Jul 20, 2027');
  });

  it('calls onConfirm when Got it is pressed', () => {
    const { getByTestId, onConfirm } = renderSheet();

    fireEvent.press(
      getByTestId(CancelMembershipTestIds.POST_CANCEL_SHEET_BUTTON),
    );

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
