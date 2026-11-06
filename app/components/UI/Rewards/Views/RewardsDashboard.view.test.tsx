/**
 * Copy trading on the Rewards dashboard, through real Redux and navigation.
 *
 * yarn jest -c jest.config.view.js app/components/UI/Rewards/Views/RewardsDashboard.view.test.tsx --runInBand --coverage=false
 */
import '../../../../../tests/component-view/mocks';
import { fireEvent } from '@testing-library/react-native';
import Routes from '../../../../constants/navigation/Routes';
import { REWARDS_VIEW_SELECTORS } from './RewardsView.constants';
import { getRouteProbeTestId } from '../../../../../tests/component-view/render';
import {
  renderRewardsDashboard,
  restoreRewardsDashboardStore,
} from '../../../../../tests/component-view/renderers/rewardsMoney';
import { referralMeFixture } from '../../../../../tests/component-view/presets/rewardsMoney';

describe('RewardsDashboard copy trading', () => {
  afterEach(() => {
    restoreRewardsDashboardStore();
  });

  it('opens Social profile onboarding from Start sharing while Social V1 is on', async () => {
    const { findByTestId, getByTestId } = renderRewardsDashboard({
      socialV1: true,
    });

    expect(
      await findByTestId(REWARDS_VIEW_SELECTORS.COPY_TRADING_SECTION),
    ).toBeOnTheScreen();

    fireEvent.press(getByTestId(REWARDS_VIEW_SELECTORS.COPY_TRADING_ACTION));

    expect(
      await findByTestId(getRouteProbeTestId(Routes.SOCIAL.PROFILE_ONBOARDING)),
    ).toBeOnTheScreen();
  });

  it('shows Earn rewards while Social V1 is off', async () => {
    const { findByTestId, queryByTestId } = renderRewardsDashboard({
      socialV1: false,
    });

    expect(
      await findByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_PREVIEW),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_VIEW_SELECTORS.COPY_TRADING_SECTION),
    ).not.toBeOnTheScreen();
  });

  it('shows Earn rewards when the copy-trading strings are missing', async () => {
    const referralMe = referralMeFixture('plain');
    const { findByTestId, queryByTestId } = renderRewardsDashboard({
      socialV1: true,
      referralMe: {
        ...referralMe,
        localized_text: {
          ...referralMe.localized_text,
          copyTradingEmptyDescription: '',
          copyTradingEmptyAction: '',
        },
      },
    });

    expect(
      await findByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_PREVIEW),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_VIEW_SELECTORS.COPY_TRADING_SECTION),
    ).not.toBeOnTheScreen();
  });
});
