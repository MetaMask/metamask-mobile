import '../../../../../../../tests/component-view/mocks';
import { waitFor, within } from '@testing-library/react-native';
import { WAYS_TO_EARN_TAB_TEST_IDS } from './WaysToEarnTab.testIds';
import { REFEREE_HERO_CARD_TEST_IDS } from '../RefereeHeroCard.testIds';
import { REFERER_HERO_CARD_TEST_IDS } from '../RefererHeroCard';
import { renderWaysToEarnTab } from '../../../../../../../tests/component-view/renderers/rewardsMoney';
import {
  REFERRAL_LOCALIZED_TEXT,
  referralMeFixture,
  referralMeWithInvitedBenefit,
  REFEREE_INVITED_BENEFIT_TITLE,
} from '../../../../../../../tests/component-view/presets/rewardsMoney';
import type { ReferralMeDto } from '../../../../../../../app/core/Engine/controllers/rewards-money-controller/types';

const LOAD_TIMEOUT = 3000;

function referralMeCalls(engine: jest.Mock): unknown[][] {
  return engine.mock.calls.filter(
    (call) => call[0] === 'RewardsMoneyController:getReferralMe',
  );
}

function referrerWithRefereeTitle(): ReferralMeDto {
  const referralMe = referralMeFixture('referrer');
  return {
    ...referralMe,
    localized_text: {
      ...referralMe.localized_text,
      invitedBenefitTitle: REFEREE_INVITED_BENEFIT_TITLE,
    },
  };
}

describe('WaysToEarnTab', () => {
  it('shows the invited benefit title once referral me loads for a referee (A3, RWDS-1673)', async () => {
    const view = renderWaysToEarnTab(referralMeWithInvitedBenefit());

    expect(
      await view.findByText(
        REFEREE_INVITED_BENEFIT_TITLE,
        {},
        { timeout: LOAD_TIMEOUT },
      ),
    ).toBeOnTheScreen();
    expect(
      within(view.getByTestId(WAYS_TO_EARN_TAB_TEST_IDS.CONTAINER)).getByText(
        REFEREE_INVITED_BENEFIT_TITLE,
      ),
    ).toBeOnTheScreen();
    expect(
      view.getByTestId(REFEREE_HERO_CARD_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      view.queryByText(REFERRAL_LOCALIZED_TEXT.earnEligibleFees),
    ).not.toBeOnTheScreen();
    await waitFor(() => {
      expect(referralMeCalls(view.engine).length).toBeGreaterThan(0);
    });
  });

  it('shows the referrer fee title once referral me loads, not the invited benefit title', async () => {
    const view = renderWaysToEarnTab(referrerWithRefereeTitle());

    expect(
      await view.findByText(
        REFERRAL_LOCALIZED_TEXT.earnEligibleFees,
        {},
        { timeout: LOAD_TIMEOUT },
      ),
    ).toBeOnTheScreen();
    expect(
      within(view.getByTestId(WAYS_TO_EARN_TAB_TEST_IDS.CONTAINER)).getByText(
        REFERRAL_LOCALIZED_TEXT.earnEligibleFees,
      ),
    ).toBeOnTheScreen();
    expect(
      view.getByTestId(REFERER_HERO_CARD_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      view.queryByText(REFEREE_INVITED_BENEFIT_TITLE),
    ).not.toBeOnTheScreen();
    expect(
      view.queryByTestId(REFEREE_HERO_CARD_TEST_IDS.CONTAINER),
    ).not.toBeOnTheScreen();
    await waitFor(() => {
      expect(referralMeCalls(view.engine).length).toBeGreaterThan(0);
    });
  });
});
