import { initialState as bridgeInitialState } from '../../../app/core/redux/slices/bridge';
import type { DeeplinkFixtureState } from '../../../app/core/DeeplinkManager/__fixtures__/deeplinkUriCases';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import { initialStatePerps } from './perpsStatePreset';
import { buildNotificationsState } from './notifications';

/**
 * Baseline for deeplink contract/navigation suites: unlocked existing account,
 * supported mainnet network, returning Perps user with Pro mode off, Predict
 * home redesign off (flag absent), notifications enabled (the real
 * notification-settings screens redirect away when they are off), and the
 * Rewards-tab layout (Social V1 control). Other tab layouts and feature
 * configurations are not represented.
 */
const baselineBuilder = () =>
  initialStatePerps({ socialEnabled: false })
    .withOverrides(buildNotificationsState())
    .withOverrides({
      engine: {
        backgroundState: {
          PerpsController: {
            isFirstTimeUser: { mainnet: false, testnet: false },
          },
        },
      },
    } as unknown as DeepPartial<RootState>);

const STATE_OVERRIDES: Record<
  Exclude<DeeplinkFixtureState, 'baseline'>,
  DeepPartial<RootState>
> = {
  'perps-first-time': {
    engine: {
      backgroundState: {
        PerpsController: {
          isFirstTimeUser: { mainnet: true, testnet: true },
        },
      },
    },
  } as unknown as DeepPartial<RootState>,
  'rewards-stale': {
    rewards: {
      onboardingReferralCode: 'STALE_REFERRAL',
      pendingDeeplink: { page: 'campaigns', campaign: 'ondo' },
    },
  } as unknown as DeepPartial<RootState>,
  'swap-session-seeded': {
    bridge: {
      ...bridgeInitialState,
      sourceAmount: '42',
      isMaxSourceAmount: true,
      bridgeViewMode: 'Bridge',
    },
  } as unknown as DeepPartial<RootState>,
};

export const initialStateDeeplinks = (
  name: DeeplinkFixtureState = 'baseline',
): DeepPartial<RootState> => {
  const builder = baselineBuilder();
  return name === 'baseline'
    ? builder.build()
    : builder.withOverrides(STATE_OVERRIDES[name]).build();
};
