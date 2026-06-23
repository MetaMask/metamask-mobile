import { handleMoney } from '../handleMoney';
import handleDeepLinkModalDisplay from '../handleDeepLinkModalDisplay';
import NavigationService from '../../../../NavigationService';
import ReduxService from '../../../../redux';
import Routes from '../../../../../constants/navigation/Routes';
import DevLogger from '../../../../SDKConnect/utils/DevLogger';
import Logger from '../../../../../util/Logger';
import { selectMoneyOnboardingSeen } from '../../../../../reducers/user';
import { selectMoneyEnableMoneyAccountFlag } from '../../../../../components/UI/Money/selectors/featureFlags';
import { selectIsMoneyAccountGeoEligible } from '../../../../../components/UI/Money/selectors/eligibility';
import { selectMoneyOnboardingStepperAnimationEnabled } from '../../../../../selectors/featureFlagController/moneyAccount';
import { DeepLinkModalLinkType } from '../../../types/deepLink.types';

jest.mock('../../../../NavigationService');
jest.mock('../../../../SDKConnect/utils/DevLogger');
jest.mock('../../../../../util/Logger');
jest.mock('../handleDeepLinkModalDisplay', () => jest.fn());

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

jest.mock('../../../../../components/UI/Money/selectors/featureFlags', () => ({
  selectMoneyEnableMoneyAccountFlag: jest.fn(),
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

describe('handleMoney', () => {
  let mockNavigate: jest.Mock;
  const mockState = {} as ReturnType<typeof ReduxService.store.getState>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockNavigate = jest.fn();
    NavigationService.navigation = {
      navigate: mockNavigate,
    } as unknown as typeof NavigationService.navigation;

    jest.mocked(ReduxService.store.getState).mockReturnValue(mockState);
    jest.mocked(selectMoneyEnableMoneyAccountFlag).mockReturnValue(true);
    jest.mocked(selectIsMoneyAccountGeoEligible).mockReturnValue(true);
    jest.mocked(selectMoneyOnboardingSeen).mockReturnValue(true);
    jest
      .mocked(selectMoneyOnboardingStepperAnimationEnabled)
      .mockReturnValue(true);
  });

  it('opens unsupported deep link modal when money account flag is disabled', () => {
    jest.mocked(selectMoneyEnableMoneyAccountFlag).mockReturnValue(false);

    handleMoney();

    expect(handleDeepLinkModalDisplay).toHaveBeenCalledWith({
      linkType: DeepLinkModalLinkType.UNSUPPORTED,
      onBack: expect.any(Function),
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates to WALLET.HOME when unsupported modal back callback runs', () => {
    jest.mocked(selectMoneyEnableMoneyAccountFlag).mockReturnValue(false);

    handleMoney();

    const [{ onBack }] = jest.mocked(handleDeepLinkModalDisplay).mock.calls[0];
    onBack();

    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
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

  it('navigates to MONEY.HOME when flag is disabled even if onboarding not seen', () => {
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
    jest.mocked(selectMoneyEnableMoneyAccountFlag).mockImplementation(() => {
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
    jest.mocked(selectMoneyEnableMoneyAccountFlag).mockImplementation(() => {
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
