import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import {
  MONEY_ACCOUNT_CAMPAIGN_NAMES,
  MONEY_ACCOUNT_CAMPAIGN_PLATFORMS,
} from '../../constants/moneyEvents';
import { selectIsUnlocked } from '../../../../../selectors/keyringController';
import { selectHasAaveTokenMeetingDepositMinimum } from '../../selectors/aaveOutputTokenEligibility';
import { selectIsMoneyAccountVisible } from '../../selectors/visibility';
import MoneyDepositBrazeCampaignObserver, {
  __resetMoneyDepositBrazeCampaignEventForTesting,
} from './MoneyDepositBrazeCampaignObserver';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));
jest.mock('../../hooks/useMoneyAnalytics');

const mockUseSelector = jest.mocked(useSelector);
const mockUseMoneyAnalytics = jest.mocked(useMoneyAnalytics);
const mockTrackCampaignTriggered = jest.fn();
let isMoneyAccountVisible = true;
let isUnlocked = true;
let hasAaveTokenMeetingDepositMinimum = true;

const arrangeVisibility = (isVisible: boolean) => {
  isMoneyAccountVisible = isVisible;
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectIsMoneyAccountVisible) {
      return isMoneyAccountVisible;
    }
    if (selector === selectIsUnlocked) {
      return isUnlocked;
    }
    if (selector === selectHasAaveTokenMeetingDepositMinimum) {
      return hasAaveTokenMeetingDepositMinimum;
    }
    return undefined;
  });
};

describe('MoneyDepositBrazeCampaignObserver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetMoneyDepositBrazeCampaignEventForTesting();
    isUnlocked = true;
    hasAaveTokenMeetingDepositMinimum = true;
    arrangeVisibility(true);
    mockUseMoneyAnalytics.mockReturnValue({
      trackCampaignTriggered: mockTrackCampaignTriggered,
    } as never);
  });

  it('does not emit when Money account is not visible', () => {
    arrangeVisibility(false);

    render(<MoneyDepositBrazeCampaignObserver />);

    expect(mockTrackCampaignTriggered).not.toHaveBeenCalled();
  });

  it('does not emit while the wallet is locked', () => {
    isUnlocked = false;

    render(<MoneyDepositBrazeCampaignObserver />);

    expect(mockTrackCampaignTriggered).not.toHaveBeenCalled();
  });

  it('does not emit when the Aave output token is below the deposit minimum', () => {
    hasAaveTokenMeetingDepositMinimum = false;
    arrangeVisibility(true);

    render(<MoneyDepositBrazeCampaignObserver />);

    expect(mockTrackCampaignTriggered).not.toHaveBeenCalled();
  });

  it('emits the aToken campaign when all eligibility conditions pass', async () => {
    render(<MoneyDepositBrazeCampaignObserver />);

    await waitFor(() => {
      expect(mockTrackCampaignTriggered).toHaveBeenCalledWith({
        campaign_name:
          MONEY_ACCOUNT_CAMPAIGN_NAMES.MONEY_ACCOUNT_EARN_ONE_TAP_OUTREACH_ATOKENS,
        campaign_platform: MONEY_ACCOUNT_CAMPAIGN_PLATFORMS.BRAZE,
      });
    });
  });

  it('emits once per process', async () => {
    const { rerender } = render(<MoneyDepositBrazeCampaignObserver />);
    rerender(<MoneyDepositBrazeCampaignObserver />);

    await waitFor(() => {
      expect(mockTrackCampaignTriggered).toHaveBeenCalledTimes(1);
    });
  });
});
