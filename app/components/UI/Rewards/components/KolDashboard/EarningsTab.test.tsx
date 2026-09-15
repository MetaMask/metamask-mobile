import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import EarningsTab from './EarningsTab';
import { KOL_DASHBOARD_SELECTORS } from './KolDashboard.testIds';
import { formatUsd } from './rewardsUiFixtures';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('./ClaimMoneyFallOverlay', () => () => null);

describe('EarningsTab', () => {
  beforeEach(() => {
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('animates available-to-claim to zero when Claim is pressed with reduce motion', async () => {
    const onClaimableChange = jest.fn();
    const { getByTestId } = render(
      <EarningsTab onClaimableChange={onClaimableChange} />,
    );

    fireEvent.press(getByTestId(KOL_DASHBOARD_SELECTORS.CLAIM_BUTTON));

    await waitFor(() => {
      expect(
        getByTestId(KOL_DASHBOARD_SELECTORS.AVAILABLE_TO_CLAIM),
      ).toHaveTextContent(formatUsd(0));
    });
    expect(onClaimableChange).toHaveBeenCalledWith(false);
  });
});
