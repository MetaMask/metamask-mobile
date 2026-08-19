import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import Routes from '../../../../constants/navigation/Routes';
import { useActivityBlockExplorer } from '../hooks/useActivityBlockExplorer';
import {
  ActivityDetailsSelectorsIDs,
  getActivityDetailsStepFailureTestId,
  getActivityDetailsStepTestId,
} from '../ActivityDetails.testIds';
import {
  ActivityDetailsStepTimeline,
  type ActivityDetailsStep,
} from './ActivityDetailsStepTimeline';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../hooks/useActivityBlockExplorer', () => ({
  useActivityBlockExplorer: jest.fn(() => undefined),
}));

/**
 * Today's step builders always place the failure last, so these assertions pin
 * the renderer's own behaviour for step lists that will not.
 */
describe('ActivityDetailsStepTimeline', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    jest.mocked(useActivityBlockExplorer).mockReturnValue(undefined);
  });

  const steps: ActivityDetailsStep[] = [
    { label: 'Approve funds', subtext: '2:14 PM', status: 'completed' },
    { label: 'Bridge funds', subtext: 'Failed', status: 'failed' },
    { label: 'Receive USDC', status: 'upcoming' },
    { label: 'Add funds', status: 'upcoming' },
  ];

  it('marks whichever step failed with the cross, and no other step', () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      <ActivityDetailsStepTimeline steps={steps} title="Steps" />,
    );

    expect(getByTestId(getActivityDetailsStepFailureTestId(1))).toBeDefined();
    [0, 2, 3].forEach((index) =>
      expect(queryByTestId(getActivityDetailsStepFailureTestId(index))).toBeNull(),
    );
  });

  it('marks every failed step when more than one leg failed', () => {
    const { getByTestId } = renderWithProvider(
      <ActivityDetailsStepTimeline
        steps={[
          { label: 'Approve funds', status: 'failed' },
          { label: 'Bridge funds', status: 'completed' },
          { label: 'Add funds', status: 'failed' },
        ]}
        title="Steps"
      />,
    );

    expect(getByTestId(getActivityDetailsStepFailureTestId(0))).toBeDefined();
    expect(getByTestId(getActivityDetailsStepFailureTestId(2))).toBeDefined();
  });

  describe('failure sheet', () => {
    const withMessage: ActivityDetailsStep[] = [
      { label: 'Approve funds', status: 'completed' },
      {
        label: 'Bridge funds',
        status: 'failed',
        failureMessage: 'The bridge did not complete.',
      },
    ];

    it('opens the sheet with the failure message instead of the explorer', () => {
      const { getByTestId, queryByTestId } = renderWithProvider(
        <ActivityDetailsStepTimeline steps={withMessage} title="Steps" />,
      );

      expect(
        queryByTestId(ActivityDetailsSelectorsIDs.STEP_FAILURE_SHEET),
      ).toBeNull();

      fireEvent.press(getByTestId(getActivityDetailsStepTestId(1)));

      expect(
        getByTestId(ActivityDetailsSelectorsIDs.STEP_FAILURE_MESSAGE).props
          .children,
      ).toBe('The bridge did not complete.');
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('dismisses itself before opening the explorer, so it cannot sit over the webview', () => {
      jest.mocked(useActivityBlockExplorer).mockReturnValue({
        url: 'https://arbiscan.io/tx/0xdeposit',
        title: 'Arbiscan',
      });

      const { getByTestId, queryByTestId } = renderWithProvider(
        <ActivityDetailsStepTimeline
          explorerTarget={{ chainId: 'eip155:42161', hash: '0xdeposit' }}
          steps={withMessage}
          title="Steps"
        />,
      );

      fireEvent.press(getByTestId(getActivityDetailsStepTestId(1)));
      fireEvent.press(
        getByTestId(ActivityDetailsSelectorsIDs.BLOCK_EXPLORER_BUTTON),
      );

      expect(
        queryByTestId(ActivityDetailsSelectorsIDs.STEP_FAILURE_SHEET),
      ).toBeNull();
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.WEBVIEW.MAIN,
        expect.anything(),
      );
    });

    it('leaves non-failed rows alone', () => {
      const { getByTestId, queryByTestId } = renderWithProvider(
        <ActivityDetailsStepTimeline steps={withMessage} title="Steps" />,
      );

      fireEvent.press(getByTestId(getActivityDetailsStepTestId(0)));

      expect(
        queryByTestId(ActivityDetailsSelectorsIDs.STEP_FAILURE_SHEET),
      ).toBeNull();
    });

    it('does nothing on a failed row with no message and no explorer link', () => {
      const { getByTestId, queryByTestId } = renderWithProvider(
        <ActivityDetailsStepTimeline
          steps={[{ label: 'Add funds', status: 'failed' }]}
          title="Steps"
        />,
      );

      fireEvent.press(getByTestId(getActivityDetailsStepTestId(0)));

      expect(
        queryByTestId(ActivityDetailsSelectorsIDs.STEP_FAILURE_SHEET),
      ).toBeNull();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it('renders every step row regardless of where the failure sits', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <ActivityDetailsStepTimeline steps={steps} title="Steps" />,
    );

    steps.forEach((step, index) => {
      expect(getByText(step.label)).toBeDefined();
      expect(getByTestId(getActivityDetailsStepTestId(index))).toBeDefined();
    });
  });
});
