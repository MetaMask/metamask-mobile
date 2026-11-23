/**
 * Accepted-splash close behavior through a real navigation stack.
 *
 * yarn jest -c jest.config.view.js app/components/UI/Rewards/Views/RewardsMoneyReferralAcceptedSplashView.view.test.tsx --runInBand --coverage=false
 */
import '../../../../../tests/component-view/mocks';
import { fireEvent, waitFor } from '@testing-library/react-native';
import Routes from '../../../../constants/navigation/Routes';
import { getRouteProbeTestId } from '../../../../../tests/component-view/render';
import {
  REFERRAL_SPLASH_JOURNEY_DESTINATION_ROUTE,
  REFERRAL_SPLASH_JOURNEY_TEST_IDS,
  renderRewardsMoneyReferralAcceptedSplash,
  renderRewardsMoneyReferralSplashJourney,
} from '../../../../../tests/component-view/renderers/rewardsMoney';
import { REWARDS_MONEY_REFERRAL_ACCEPTED_SPLASH_TEST_IDS } from './RewardsMoneyReferralAcceptedSplashView';

describe('RewardsMoneyReferralAcceptedSplashView', () => {
  it('close returns to the destination beneath the splash and clears the code', async () => {
    const { findByTestId, getByTestId, queryByTestId, store } =
      renderRewardsMoneyReferralSplashJourney({
        pendingReferralCode: 'KOL1',
      });

    fireEvent.press(getByTestId(REFERRAL_SPLASH_JOURNEY_TEST_IDS.OPEN));

    expect(
      await findByTestId(
        REWARDS_MONEY_REFERRAL_ACCEPTED_SPLASH_TEST_IDS.CONTAINER,
      ),
    ).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(REWARDS_MONEY_REFERRAL_ACCEPTED_SPLASH_TEST_IDS.CLOSE),
    );

    await waitFor(() => {
      expect(
        queryByTestId(
          REWARDS_MONEY_REFERRAL_ACCEPTED_SPLASH_TEST_IDS.CONTAINER,
        ),
      ).not.toBeOnTheScreen();
    });

    expect(
      await findByTestId(
        getRouteProbeTestId(REFERRAL_SPLASH_JOURNEY_DESTINATION_ROUTE),
      ),
    ).toBeOnTheScreen();
    await waitFor(() => {
      expect(store.getState().rewardsMoney.pendingReferralCode).toBeNull();
    });
  });

  it('close opens the Money dashboard when there is no back stack', async () => {
    const { findByTestId, getByTestId, store } =
      renderRewardsMoneyReferralAcceptedSplash({
        pendingReferralCode: 'KOL1',
      });

    expect(
      await findByTestId(
        REWARDS_MONEY_REFERRAL_ACCEPTED_SPLASH_TEST_IDS.CONTAINER,
      ),
    ).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(REWARDS_MONEY_REFERRAL_ACCEPTED_SPLASH_TEST_IDS.CLOSE),
    );

    expect(
      await findByTestId(getRouteProbeTestId(Routes.REWARDS_VIEW)),
    ).toBeOnTheScreen();
    await waitFor(() => {
      expect(store.getState().rewardsMoney.pendingReferralCode).toBeNull();
    });
  });
});
