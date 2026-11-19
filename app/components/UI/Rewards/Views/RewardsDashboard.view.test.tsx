/**
 * Rewards points dashboard through real Redux and navigation.
 *
 * yarn jest -c jest.config.view.js app/components/UI/Rewards/Views/RewardsDashboard.view.test.tsx --runInBand --coverage=false
 */
import '../../../../../tests/component-view/mocks';
import { act, fireEvent, within } from '@testing-library/react-native';
import { AvatarIcon, IconName } from '@metamask/design-system-react-native';
import Routes from '../../../../constants/navigation/Routes';
import Engine from '../../../../core/Engine';
import { updateBgState } from '../../../../core/redux/slices/engine';
import { REWARDS_OPT_IN_SECTION_TEST_IDS } from '../components/Money/RewardsOptInSection';
import { REWARDS_VIEW_SELECTORS } from './RewardsView.constants';
import { getRouteProbeTestId } from '../../../../../tests/component-view/render';
import {
  renderRewardsDashboard,
  restoreRewardsDashboardStore,
} from '../../../../../tests/component-view/renderers/rewardsMoney';
import { referralMeFixture } from '../../../../../tests/component-view/presets/rewardsMoney';
import { strings } from '../../../../../locales/i18n';

const engineWithState = Engine as unknown as {
  state?: Record<string, unknown>;
};

const publishDeviceGeo = (
  store: { dispatch: (action: unknown) => void },
  location: string,
  status: 'complete' | 'error' = 'complete',
) => {
  engineWithState.state = {
    ...(engineWithState.state ?? {}),
    GeolocationController: { location, status },
  };
  act(() => {
    store.dispatch(updateBgState({ key: 'GeolocationController' }));
  });
};

const optedIn = (engine: jest.Mock) =>
  engine.mock.calls.some((call) => call[0] === 'RewardsController:optIn');

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

    expect(
      within(
        getByTestId(REWARDS_VIEW_SELECTORS.COPY_TRADING_EMPTY),
      ).UNSAFE_getByType(AvatarIcon).props.iconName,
    ).toBe(IconName.People);

    fireEvent.press(getByTestId(REWARDS_VIEW_SELECTORS.COPY_TRADING_ACTION));

    expect(
      await findByTestId(getRouteProbeTestId(Routes.SOCIAL.PROFILE_ONBOARDING)),
    ).toBeOnTheScreen();
  });

  it('shows Earn rewards while Social V1 is off', async () => {
    const { findByTestId, queryByTestId } = renderRewardsDashboard({
      socialV1: false,
      showEarnRewards: true,
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
      showEarnRewards: true,
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

describe('RewardsDashboard subscription sections', () => {
  afterEach(() => {
    restoreRewardsDashboardStore();
  });

  it('shows the campaign opt-in instead of campaigns and benefits', async () => {
    const { findByTestId, queryByTestId } = renderRewardsDashboard({
      socialV1: false,
      subscriptionId: null,
      showEarnRewards: true,
    });

    expect(
      await findByTestId(REWARDS_OPT_IN_SECTION_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      await findByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_PREVIEW),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_VIEW_SELECTORS.CAMPAIGNS_PREVIEW),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_VIEW_SELECTORS.TOP_BENEFIT_SECTION),
    ).not.toBeOnTheScreen();
  });

  it('uses the campaign opt-in label when referral copy has no action', async () => {
    const referralMe = referralMeFixture('plain');
    const { findByTestId } = renderRewardsDashboard({
      socialV1: false,
      subscriptionId: null,
      referralMe: {
        ...referralMe,
        localized_text: {
          ...referralMe.localized_text,
          invitedOptInAction: '',
        },
      },
    });

    expect(
      await findByTestId(REWARDS_OPT_IN_SECTION_TEST_IDS.ACTION),
    ).toHaveTextContent(strings('rewards.campaign.opt_in_cta'));
  });

  it('shows campaigns and benefits when the user has a Rewards subscription', async () => {
    const { findByTestId, queryByTestId } = renderRewardsDashboard({
      socialV1: false,
      subscriptionId: 'sub-1',
      showEarnRewards: true,
    });

    expect(
      await findByTestId(REWARDS_VIEW_SELECTORS.CAMPAIGNS_PREVIEW),
    ).toBeOnTheScreen();
    expect(
      await findByTestId(REWARDS_VIEW_SELECTORS.TOP_BENEFIT_SECTION),
    ).toBeOnTheScreen();
    expect(
      await findByTestId(REWARDS_VIEW_SELECTORS.EARN_REWARDS_PREVIEW),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_OPT_IN_SECTION_TEST_IDS.CONTAINER),
    ).not.toBeOnTheScreen();
  });
});

describe('RewardsDashboard opt-in geolocation', () => {
  const regionBlocked = strings(
    'rewards.onboarding.not_supported_region_description',
  );
  let engineStateBefore: Record<string, unknown> | undefined;

  beforeEach(() => {
    engineStateBefore = engineWithState.state;
  });

  afterEach(() => {
    if (engineStateBefore === undefined) {
      delete engineWithState.state;
    } else {
      engineWithState.state = engineStateBefore;
    }
    restoreRewardsDashboardStore();
  });

  it('holds the opt-in CTA while the device location is unresolved', async () => {
    const { findByTestId, queryByText, engine } = renderRewardsDashboard({
      socialV1: false,
      subscriptionId: null,
      geoStatus: 'loading',
    });

    const action = await findByTestId(REWARDS_OPT_IN_SECTION_TEST_IDS.ACTION);
    fireEvent.press(action);

    expect(action.props.accessibilityState?.disabled).toBe(true);
    expect(queryByText(regionBlocked)).not.toBeOnTheScreen();
    expect(optedIn(engine)).toBe(false);
  });

  it('disables opt-in and explains a blocked region', async () => {
    const { findByTestId, findByText, engine } = renderRewardsDashboard({
      socialV1: false,
      subscriptionId: null,
      geoLocation: 'GB',
    });

    expect(await findByText(regionBlocked)).toBeOnTheScreen();
    fireEvent.press(await findByTestId(REWARDS_OPT_IN_SECTION_TEST_IDS.ACTION));

    expect(optedIn(engine)).toBe(false);
  });

  it('blocks opt-in after the open dashboard sees a blocked location', async () => {
    const { findByTestId, findByText, queryByText, store, engine } =
      renderRewardsDashboard({
        socialV1: false,
        subscriptionId: null,
        geoLocation: 'US',
      });

    const action = await findByTestId(REWARDS_OPT_IN_SECTION_TEST_IDS.ACTION);

    expect(action.props.accessibilityState?.disabled ?? false).toBe(false);
    expect(queryByText(regionBlocked)).not.toBeOnTheScreen();

    publishDeviceGeo(store, 'GB');

    expect(await findByText(regionBlocked)).toBeOnTheScreen();
    fireEvent.press(action);

    expect(optedIn(engine)).toBe(false);
  });

  it('keeps opt-in blocked when a refresh fails after a blocked location', async () => {
    const { findByText, findByTestId, engine } = renderRewardsDashboard({
      socialV1: false,
      subscriptionId: null,
      geoLocation: 'GB',
      geoStatus: 'error',
    });

    expect(await findByText(regionBlocked)).toBeOnTheScreen();
    fireEvent.press(await findByTestId(REWARDS_OPT_IN_SECTION_TEST_IDS.ACTION));

    expect(optedIn(engine)).toBe(false);
  });
});
