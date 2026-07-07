import type { Json } from '@metamask/utils';
import { getVersion } from 'react-native-device-info';
import { handleMoney } from '../handleMoney';
import NavigationService from '../../../../NavigationService';
import ReduxService from '../../../../redux';
import Routes from '../../../../../constants/navigation/Routes';
import DevLogger from '../../../../SDKConnect/utils/DevLogger';
import Logger from '../../../../../util/Logger';
import { selectMoneyOnboardingSeen } from '../../../../../reducers/user';
import { selectIsMoneyAccountGeoEligible } from '../../../../../components/UI/Money/selectors/eligibility';
import { selectMoneyOnboardingStepperAnimationEnabled } from '../../../../../selectors/featureFlagController/moneyAccount';
import {
  selectRawRemoteFeatureFlags,
  selectRemoteFeatureFlags,
} from '../../../../../selectors/featureFlagController';
import { MONEY_ENABLE_MONEY_ACCOUNT_FLAG_NAME } from '../../../../../lib/Money/feature-flags';

jest.mock('../../../../NavigationService');
jest.mock('../../../../SDKConnect/utils/DevLogger');
jest.mock('../../../../../util/Logger');

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('8.0.1'),
}));

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

jest.mock('../../../../../reducers/user', () => ({
  selectMoneyOnboardingSeen: jest.fn(),
}));

jest.mock('../../../../../components/UI/Money/selectors/eligibility', () => ({
  selectIsMoneyAccountGeoEligible: jest.fn(),
}));

jest.mock(
  '../../../../../selectors/featureFlagController/moneyAccount',
  () => ({
    selectMoneyOnboardingStepperAnimationEnabled: jest.fn(),
  }),
);

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
    jest.mocked(getVersion).mockReturnValue('8.0.1');
    setMoneyAccountFlags();
    jest.mocked(selectIsMoneyAccountGeoEligible).mockReturnValue(true);
    jest.mocked(selectMoneyOnboardingSeen).mockReturnValue(true);
    jest
      .mocked(selectMoneyOnboardingStepperAnimationEnabled)
      .mockReturnValue(true);
  });

  it('navigates to disabled deeplink modal when type 1 flag is disabled', () => {
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

  it('navigates to disabled deeplink modal when type 1 flag minimum version fails', () => {
    jest.mocked(getVersion).mockReturnValue('7.0.0');
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

  it('navigates to disabled deeplink modal when rollout enabled cohort minimum version fails', () => {
    jest.mocked(getVersion).mockReturnValue('7.0.0');
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
    jest.mocked(selectIsMoneyAccountGeoEligible).mockReturnValue(false);

    handleMoney();

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.GEO_BLOCK_SHEET,
    });
  });

  it('navigates to MONEY.ONBOARDING when user has not seen onboarding', () => {
    jest.mocked(selectMoneyOnboardingSeen).mockReturnValue(false);

    handleMoney();

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.ONBOARDING);
  });

  it('navigates to MONEY.HOME when onboarding has not been seen and onboarding is disabled', () => {
    jest.mocked(selectMoneyOnboardingSeen).mockReturnValue(false);
    jest
      .mocked(selectMoneyOnboardingStepperAnimationEnabled)
      .mockReturnValue(false);

    handleMoney();

    expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
  });

  it('navigates to MONEY.HOME when user has already seen onboarding', () => {
    handleMoney();

    expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
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
