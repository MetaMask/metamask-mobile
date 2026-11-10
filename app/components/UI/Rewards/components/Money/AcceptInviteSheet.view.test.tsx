/**
 * Deeplink invite sheet through the shared Money preset.
 *
 * yarn jest -c jest.config.view.js app/components/UI/Rewards/components/Money/AcceptInviteSheet.view.test.tsx --runInBand --coverage=false
 */
import '../../../../../../tests/component-view/mocks';
import { fireEvent, waitFor } from '@testing-library/react-native';
import Routes from '../../../../../constants/navigation/Routes';
import { getRouteProbeTestId } from '../../../../../../tests/component-view/render';
import { renderRewardsMoneyInviteSheet } from '../../../../../../tests/component-view/renderers/rewardsMoney';
import { ACCEPT_INVITE_SHEET_TEST_IDS } from './AcceptInviteSheet';

describe('AcceptInviteSheet', () => {
  it('clears the offered deeplink code when the invite is declined', async () => {
    const { findByTestId, getByTestId, queryByTestId, store } =
      renderRewardsMoneyInviteSheet({
        pendingReferralCode: 'KOL1',
        referralCode: 'KOL1',
        entryType: 'deeplink',
      });

    expect(
      await findByTestId(ACCEPT_INVITE_SHEET_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();

    fireEvent.press(getByTestId(ACCEPT_INVITE_SHEET_TEST_IDS.DECLINE));

    await waitFor(() => {
      expect(store.getState().rewardsMoney.pendingReferralCode).toBeNull();
    });

    expect(store.getState().rewardsMoney.answeredReferralCode).toBe('KOL1');
    expect(
      queryByTestId(ACCEPT_INVITE_SHEET_TEST_IDS.CONTAINER),
    ).not.toBeOnTheScreen();
  });

  it('opens the accepted splash and keeps the code pending after an accept', async () => {
    const { findByTestId, getByTestId, store } = renderRewardsMoneyInviteSheet({
      pendingReferralCode: 'KOL1',
      referralCode: 'KOL1',
      entryType: 'deeplink',
    });

    await findByTestId(ACCEPT_INVITE_SHEET_TEST_IDS.CONTAINER);

    // Referral-code validation is debounced 1000ms; Accept stays disabled until it resolves.
    await waitFor(
      () => {
        expect(
          getByTestId(ACCEPT_INVITE_SHEET_TEST_IDS.ACCEPT),
        ).not.toBeDisabled();
      },
      { timeout: 3000 },
    );

    fireEvent.press(getByTestId(ACCEPT_INVITE_SHEET_TEST_IDS.ACCEPT));

    // registerReferee must complete before the accepted splash route probe renders.
    expect(
      await findByTestId(
        getRouteProbeTestId(Routes.REWARDS_MONEY_REFERRAL_ACCEPTED_SPLASH_VIEW),
        {},
        { timeout: 3000 },
      ),
    ).toBeOnTheScreen();
    expect(store.getState().rewardsMoney.pendingReferralCode).toBe('KOL1');
  });
});
