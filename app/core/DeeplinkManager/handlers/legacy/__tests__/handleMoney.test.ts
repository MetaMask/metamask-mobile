import type { Json } from '@metamask/utils';
import { handleMoney } from '../handleMoney';
import NavigationService from '../../../../NavigationService';
import ReduxService from '../../../../redux';
import Routes from '../../../../../constants/navigation/Routes';
import DevLogger from '../../../../SDKConnect/utils/DevLogger';
import Logger from '../../../../../util/Logger';
import { selectMoneyEntryContext } from '../../../../../components/UI/Money/selectors/entry';
import { selectMoneyEnableMoneyAccountFlag } from '../../../../../components/UI/Money/selectors/featureFlags';
import {
  isVbaGeoBypassEnabled,
  type MoneyMovementNeobankRollout,
  selectMoneyMovementNeobank,
  selectNeobankMarkets,
} from '../../../../../selectors/featureFlagController/moneyAccount';
import {
  selectGeolocationLocation,
  selectGeolocationStatus,
} from '../../../../../selectors/geolocationController';
import {
  selectRawRemoteFeatureFlags,
  selectRemoteFeatureFlags,
} from '../../../../../selectors/featureFlagController';
import { MONEY_ENABLE_MONEY_ACCOUNT_FLAG_NAME } from '../../../../../lib/Money/feature-flags';
import { VbaOnboardingRoutes } from '../../../../../components/UI/Ramp/Views/VirtualBankAccount/routes';

jest.mock('../../../../NavigationService');
jest.mock('../../../../SDKConnect/utils/DevLogger');
jest.mock('../../../../../util/Logger');

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

jest.mock('../../../../redux', () => ({
  __esModule: true,
  default: {
    store: {
      getState: jest.fn(),
    },
  },
}));

jest.mock('../../../../../components/UI/Money/selectors/entry', () => ({
  selectMoneyEntryContext: jest.fn(),
}));

jest.mock('../../../../../components/UI/Money/selectors/featureFlags', () => ({
  selectMoneyEnableMoneyAccountFlag: jest.fn(),
}));

jest.mock(
  '../../../../../selectors/featureFlagController/moneyAccount',
  () => ({
    selectMoneyMovementNeobank: jest.fn(),
    selectNeobankMarkets: jest.fn(),
    isVbaGeoBypassEnabled: jest.fn(),
  }),
);

jest.mock('../../../../../selectors/geolocationController', () => ({
  selectGeolocationLocation: jest.fn(),
  selectGeolocationStatus: jest.fn(),
}));

jest.mock('../../../../../selectors/featureFlagController', () => ({
  selectRawRemoteFeatureFlags: jest.fn(),
  selectRemoteFeatureFlags: jest.fn(),
}));

interface VersionGatedFlag {
  enabled: boolean;
  minimumVersion: string;
}

interface GradualRolloutFlag {
  scope: {
    type: 'threshold';
    value: number;
  };
  thresholdName: string;
  thresholdVersion: number;
  value: VersionGatedFlag;
}

const enabledFlag: VersionGatedFlag = {
  enabled: true,
  minimumVersion: '8.0.1',
};

const disabledFlag: VersionGatedFlag = {
  enabled: false,
  minimumVersion: '0.0.0',
};

const enabledRolloutFlag: GradualRolloutFlag = {
  scope: {
    type: 'threshold',
    value: 0.25,
  },
  thresholdName: 'enabled',
  thresholdVersion: 2,
  value: enabledFlag,
};

const disabledRolloutFlag: GradualRolloutFlag = {
  scope: {
    type: 'threshold',
    value: 1,
  },
  thresholdName: 'disabled',
  thresholdVersion: 2,
  value: disabledFlag,
};

const enabledNeobankRollout: MoneyMovementNeobankRollout = {
  chooseCurrency: false,
  regionOverride: undefined,
};

const brlMarket = { currency: 'BRL', regions: ['BR'] } as const;

describe('handleMoney', () => {
  let mockNavigate: jest.Mock;
  const mockState = {} as ReturnType<typeof ReduxService.store.getState>;

  const setMoneyAccountFlags = ({
    rawFlag = enabledFlag,
    resolvedFlag = enabledFlag,
  }: {
    rawFlag?: unknown;
    resolvedFlag?: unknown;
  } = {}) => {
    jest.mocked(selectRawRemoteFeatureFlags).mockReturnValue({
      [MONEY_ENABLE_MONEY_ACCOUNT_FLAG_NAME]: rawFlag as Json,
    });
    jest.mocked(selectRemoteFeatureFlags).mockReturnValue({
      [MONEY_ENABLE_MONEY_ACCOUNT_FLAG_NAME]: resolvedFlag as Json,
    });
  };

  const expectDeeplinkModalNavigation = (
    title: string,
    description: string,
  ) => {
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MONEY.MODALS.DEEPLINK_MODAL,
      {
        title,
        description,
      },
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockNavigate = jest.fn();
    NavigationService.navigation = {
      navigate: mockNavigate,
    } as unknown as typeof NavigationService.navigation;

    jest.mocked(ReduxService.store.getState).mockReturnValue(mockState);
    setMoneyAccountFlags();
    jest.mocked(selectMoneyEntryContext).mockReturnValue({
      accessBlockReason: undefined,
      isOnboardingRedirectNeeded: false,
    });
    jest.mocked(selectMoneyEnableMoneyAccountFlag).mockReturnValue(true);
    jest
      .mocked(selectMoneyMovementNeobank)
      .mockReturnValue(enabledNeobankRollout);
    jest.mocked(selectNeobankMarkets).mockReturnValue([brlMarket]);
    jest.mocked(selectGeolocationLocation).mockReturnValue('BR-SP');
    jest.mocked(selectGeolocationStatus).mockReturnValue('complete');
    jest.mocked(isVbaGeoBypassEnabled).mockReturnValue(false);
  });

  it('navigates to disabled deeplink modal when type 1 flag is disabled', () => {
    jest.mocked(selectMoneyEnableMoneyAccountFlag).mockReturnValue(false);
    setMoneyAccountFlags({
      rawFlag: disabledFlag,
      resolvedFlag: disabledFlag,
    });

    handleMoney();

    expectDeeplinkModalNavigation(
      'money.deeplink_modal.money_account_disabled.title',
      'money.deeplink_modal.money_account_disabled.description',
    );
  });

  it('navigates to disabled deeplink modal when canonical selector disables an enabled standard flag', () => {
    jest.mocked(selectMoneyEnableMoneyAccountFlag).mockReturnValue(false);
    setMoneyAccountFlags({
      rawFlag: enabledFlag,
      resolvedFlag: enabledFlag,
    });

    handleMoney();

    expectDeeplinkModalNavigation(
      'money.deeplink_modal.money_account_disabled.title',
      'money.deeplink_modal.money_account_disabled.description',
    );
  });

  it('navigates to rollout exclusion deeplink modal when rollout cohort is disabled', () => {
    setMoneyAccountFlags({
      rawFlag: [enabledRolloutFlag, disabledRolloutFlag],
      resolvedFlag: disabledFlag,
    });

    handleMoney();

    expectDeeplinkModalNavigation(
      'money.deeplink_modal.excluded_from_gradual_rollout.title',
      'money.deeplink_modal.excluded_from_gradual_rollout.description',
    );
  });

  it('navigates to disabled deeplink modal when canonical selector disables an enabled rollout cohort', () => {
    jest.mocked(selectMoneyEnableMoneyAccountFlag).mockReturnValue(false);
    setMoneyAccountFlags({
      rawFlag: [enabledRolloutFlag, disabledRolloutFlag],
      resolvedFlag: enabledFlag,
    });

    handleMoney();

    expectDeeplinkModalNavigation(
      'money.deeplink_modal.money_account_disabled.title',
      'money.deeplink_modal.money_account_disabled.description',
    );
  });

  it('logs malformed rollout flag and navigates to disabled deeplink modal', () => {
    setMoneyAccountFlags({
      rawFlag: [enabledRolloutFlag, disabledRolloutFlag],
      resolvedFlag: { enabled: true },
    });

    handleMoney();

    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      '[handleMoney] getMoneyAccountFlagStatus received an invalid resolved rollout flag',
    );
    expectDeeplinkModalNavigation(
      'money.deeplink_modal.money_account_disabled.title',
      'money.deeplink_modal.money_account_disabled.description',
    );
  });

  it('navigates to geo block modal when user is not geo eligible', () => {
    jest.mocked(selectMoneyEntryContext).mockReturnValue({
      accessBlockReason: 'geo_blocked',
      isOnboardingRedirectNeeded: false,
    });

    handleMoney();

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.GEO_BLOCK_SHEET,
    });
  });

  it('navigates to MONEY.ONBOARDING when user has not seen onboarding', () => {
    jest.mocked(selectMoneyEntryContext).mockReturnValue({
      accessBlockReason: undefined,
      isOnboardingRedirectNeeded: true,
    });

    handleMoney();

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.ONBOARDING);
  });

  it('navigates to MONEY.HOME when onboarding has not been seen and onboarding is disabled', () => {
    jest.mocked(selectMoneyEntryContext).mockReturnValue({
      accessBlockReason: undefined,
      isOnboardingRedirectNeeded: false,
    });

    handleMoney();

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.HOME_TABS,
      {
        screen: Routes.MONEY.ROOT,
        params: { screen: Routes.MONEY.HOME },
      },
      { pop: true },
    );
  });

  it('navigates to MONEY.HOME when user has already seen onboarding', () => {
    handleMoney();

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.HOME_TABS,
      {
        screen: Routes.MONEY.ROOT,
        params: { screen: Routes.MONEY.HOME },
      },
      { pop: true },
    );
  });

  describe('screen=account', () => {
    const expectMoneyHomeNavigation = () =>
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.HOME_TABS,
        {
          screen: Routes.MONEY.ROOT,
          params: { screen: Routes.MONEY.HOME },
        },
        { pop: true },
      );

    it('opens the money account flow on top of MONEY.HOME when VBA eligible', () => {
      handleMoney({ moneyPath: '?screen=account' });

      expectMoneyHomeNavigation();
      expect(mockNavigate).toHaveBeenLastCalledWith(
        Routes.RAMP.VBA_ONBOARDING,
        { screen: VbaOnboardingRoutes.LOADING },
      );
      expect(mockNavigate).toHaveBeenCalledTimes(2);
    });

    it('opens the money account flow when the dev geo bypass is set', () => {
      jest.mocked(selectGeolocationLocation).mockReturnValue('US-CA');
      jest.mocked(isVbaGeoBypassEnabled).mockReturnValue(true);

      handleMoney({ moneyPath: '?screen=account' });

      expect(mockNavigate).toHaveBeenLastCalledWith(
        Routes.RAMP.VBA_ONBOARDING,
        { screen: VbaOnboardingRoutes.LOADING },
      );
    });

    it('uses the flag region override ahead of the IP location', () => {
      jest.mocked(selectGeolocationLocation).mockReturnValue('US-CA');
      jest.mocked(selectMoneyMovementNeobank).mockReturnValue({
        ...enabledNeobankRollout,
        regionOverride: 'BR',
      });

      handleMoney({ moneyPath: '?screen=account' });

      expect(mockNavigate).toHaveBeenLastCalledWith(
        Routes.RAMP.VBA_ONBOARDING,
        { screen: VbaOnboardingRoutes.LOADING },
      );
    });

    it('stays on MONEY.HOME when the VBA flag is disabled', () => {
      jest.mocked(selectNeobankMarkets).mockReturnValue([]);

      handleMoney({ moneyPath: '?screen=account' });

      expectMoneyHomeNavigation();
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });

    it('stays on MONEY.HOME when the region is not VBA eligible', () => {
      jest.mocked(selectGeolocationLocation).mockReturnValue('US-CA');

      handleMoney({ moneyPath: '?screen=account' });

      expectMoneyHomeNavigation();
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });

    it('stays on MONEY.HOME while geolocation is still loading', () => {
      jest.mocked(selectGeolocationLocation).mockReturnValue('');
      jest.mocked(selectGeolocationStatus).mockReturnValue('loading');

      handleMoney({ moneyPath: '?screen=account' });

      expectMoneyHomeNavigation();
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });

    it('shows the money onboarding first when the user has not seen it', () => {
      jest.mocked(selectMoneyEntryContext).mockReturnValue({
        accessBlockReason: undefined,
        isOnboardingRedirectNeeded: true,
      });

      handleMoney({ moneyPath: '?screen=account' });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.ONBOARDING);
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });

    it('shows the disabled modal instead when the money account flag is disabled', () => {
      jest.mocked(selectMoneyEnableMoneyAccountFlag).mockReturnValue(false);
      setMoneyAccountFlags({
        rawFlag: disabledFlag,
        resolvedFlag: disabledFlag,
      });

      handleMoney({ moneyPath: '?screen=account' });

      expectDeeplinkModalNavigation(
        'money.deeplink_modal.money_account_disabled.title',
        'money.deeplink_modal.money_account_disabled.description',
      );
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });
  });

  it('navigates to MONEY.HOME for an unknown screen value', () => {
    handleMoney({ moneyPath: '?screen=unknown' });

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.HOME_TABS,
      {
        screen: Routes.MONEY.ROOT,
        params: { screen: Routes.MONEY.HOME },
      },
      { pop: true },
    );
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('logs error and navigates to WALLET.HOME when selector throws', () => {
    const error = new Error('Selector failed');
    jest.mocked(selectRawRemoteFeatureFlags).mockImplementation(() => {
      throw error;
    });

    handleMoney();

    expect(DevLogger.log).toHaveBeenCalledWith(
      '[handleMoney] Failed to handle deeplink:',
      error,
    );
    expect(Logger.error).toHaveBeenCalledWith(
      error,
      '[handleMoney] Error handling money deeplink',
    );
    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
  });

  it('logs fallback navigation error when fallback screen navigation fails', () => {
    const deepLinkError = new Error('Deep link failed');
    const fallbackNavigationError = new Error('Fallback navigation failed');
    jest.mocked(selectRawRemoteFeatureFlags).mockImplementation(() => {
      throw deepLinkError;
    });
    mockNavigate.mockImplementation(() => {
      throw fallbackNavigationError;
    });

    handleMoney();

    expect(Logger.error).toHaveBeenNthCalledWith(
      1,
      deepLinkError,
      '[handleMoney] Error handling money deeplink',
    );
    expect(Logger.error).toHaveBeenNthCalledWith(
      2,
      fallbackNavigationError,
      '[handleMoney] Failed to navigate to fallback screen',
    );
  });
});
