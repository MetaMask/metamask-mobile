import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import {
  MONEY_ACCOUNT_CAMPAIGN_NAMES,
  MONEY_ACCOUNT_CAMPAIGN_PLATFORMS,
} from '../../constants/moneyEvents';
import { selectIsUnlocked } from '../../../../../selectors/keyringController';
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

const arrangeVisibility = (isVisible: boolean) => {
  isMoneyAccountVisible = isVisible;
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectIsMoneyAccountVisible) {
      return isMoneyAccountVisible;
    }
    if (selector === selectIsUnlocked) {
      return isUnlocked;
    }
    return undefined;
  });
};

describe('MoneyDepositBrazeCampaignObserver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetMoneyDepositBrazeCampaignEventForTesting();
    isUnlocked = true;
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

  it('emits only reusable campaign identity properties for a visible Money account', async () => {
    render(<MoneyDepositBrazeCampaignObserver />);

    await waitFor(() => {
      expect(mockTrackCampaignTriggered).toHaveBeenCalledWith({
        campaign_name:
          MONEY_ACCOUNT_CAMPAIGN_NAMES.MONEY_ACCOUNT_EARN_ONE_TAP_OUTREACH,
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
