/**
 * Ways to earn benefit copy comes from referral me, not from app strings.
 *
 * yarn jest -c jest.config.view.js app/components/UI/Rewards/components/Money/Tabs/WaysToEarnTab.view.test.tsx --runInBand --coverage=false
 */
import '../../../../../../../tests/component-view/mocks';
import { cleanup, within } from '@testing-library/react-native';
import { WAYS_TO_EARN_TAB_TEST_IDS } from './WaysToEarnTab.testIds';
import { renderWaysToEarnTab } from '../../../../../../../tests/component-view/renderers/rewardsMoney';
import {
  REFERRAL_LOCALIZED_TEXT,
  referralMeWithInvitedBenefit,
  REFEREE_INVITED_BENEFIT_TITLE,
} from '../../../../../../../tests/component-view/presets/rewardsMoney';

describe('WaysToEarnTab', () => {
  it('shows the invited benefit title the backend returns for a referee (A3, RWDS-1673)', async () => {
    const referee = renderWaysToEarnTab({
      persona: 'referee',
      referralMe: referralMeWithInvitedBenefit(),
    });

    expect(
      await referee.findByText(REFEREE_INVITED_BENEFIT_TITLE),
    ).toBeOnTheScreen();
    expect(
      within(
        referee.getByTestId(WAYS_TO_EARN_TAB_TEST_IDS.CONTAINER),
      ).getByText(REFEREE_INVITED_BENEFIT_TITLE),
    ).toBeOnTheScreen();

    cleanup();

    const referrer = renderWaysToEarnTab({ persona: 'referrer' });

    expect(
      await referrer.findByText(REFERRAL_LOCALIZED_TEXT.earnEligibleFees),
    ).toBeOnTheScreen();
    expect(
      within(
        referrer.getByTestId(WAYS_TO_EARN_TAB_TEST_IDS.CONTAINER),
      ).queryByText(REFEREE_INVITED_BENEFIT_TITLE),
    ).not.toBeOnTheScreen();
  });
});
