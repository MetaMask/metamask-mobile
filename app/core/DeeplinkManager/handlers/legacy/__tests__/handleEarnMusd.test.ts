import { handleEarnMusd } from '../handleEarnMusd';
import NavigationService from '../../../../NavigationService';
import Routes from '../../../../../constants/navigation/Routes';
import DevLogger from '../../../../SDKConnect/utils/DevLogger';
import Logger from '../../../../../util/Logger';
import { selectMusdConversionEducationSeen } from '../../../../../reducers/user';
import { selectIsMusdConversionGeoEligible } from '../../../../../components/UI/Earn/selectors/eligibility';
import { selectMoneyHubEnabledFlag } from '../../../../../components/UI/Money/selectors/featureFlags';

jest.mock('../../../../NavigationService');
jest.mock('../../../../SDKConnect/utils/DevLogger');
jest.mock('../../../../../util/Logger');

jest.mock('../../../../redux', () => ({
  __esModule: true,
  default: {
    store: {
      getState: jest.fn(),
    },
  },
}));

jest.mock('../../../../../reducers/user', () => ({
  selectMusdConversionEducationSeen: jest.fn(),
}));

jest.mock('../../../../../components/UI/Earn/selectors/eligibility', () => ({
  selectIsMusdConversionGeoEligible: jest.fn(),
}));

jest.mock('../../../../../components/UI/Money/selectors/featureFlags', () => ({
  selectMoneyHubEnabledFlag: jest.fn(),
}));

describe('handleEarnMusd', () => {
  let mockNavigate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockNavigate = jest.fn();
    NavigationService.navigation = {
      navigate: mockNavigate,
    } as unknown as typeof NavigationService.navigation;

    (DevLogger.log as jest.Mock) = jest.fn();
    (Logger.error as jest.Mock) = jest.fn();

    // Default: geo-eligible user who has seen the education screen with money hub enabled
    jest.mocked(selectIsMusdConversionGeoEligible).mockReturnValue(true);
    jest.mocked(selectMusdConversionEducationSeen).mockReturnValue(true);
    jest.mocked(selectMoneyHubEnabledFlag).mockReturnValue(true);
  });

  it('logs start of deeplink handling', () => {
    handleEarnMusd();

    expect(DevLogger.log).toHaveBeenCalledWith(
      '[handleEarnMusd] Starting deeplink handling',
    );
  });

  describe('when user has not seen the education screen', () => {
    beforeEach(() => {
      jest.mocked(selectMusdConversionEducationSeen).mockReturnValue(false);
    });

    it('navigates to the education screen when geo-eligible', () => {
      jest.mocked(selectIsMusdConversionGeoEligible).mockReturnValue(true);

      handleEarnMusd();

      expect(mockNavigate).toHaveBeenCalledWith(Routes.EARN.ROOT, {
        screen: Routes.EARN.MUSD.CONVERSION_EDUCATION,
        params: { isDeeplink: true },
      });
    });

    it('navigates to the education screen even when geo-ineligible', () => {
      jest.mocked(selectIsMusdConversionGeoEligible).mockReturnValue(false);

      handleEarnMusd();

      expect(mockNavigate).toHaveBeenCalledWith(Routes.EARN.ROOT, {
        screen: Routes.EARN.MUSD.CONVERSION_EDUCATION,
        params: { isDeeplink: true },
      });
    });

    it('does not navigate to CASH_TOKENS_FULL_VIEW', () => {
      handleEarnMusd();

      expect(mockNavigate).not.toHaveBeenCalledWith(
        Routes.WALLET.CASH_TOKENS_FULL_VIEW,
      );
    });
  });

  describe('when user has seen the education screen', () => {
    beforeEach(() => {
      jest.mocked(selectMusdConversionEducationSeen).mockReturnValue(true);
    });

    it('navigates to CASH_TOKENS_FULL_VIEW when geo-eligible and money hub is enabled', () => {
      jest.mocked(selectIsMusdConversionGeoEligible).mockReturnValue(true);
      jest.mocked(selectMoneyHubEnabledFlag).mockReturnValue(true);

      handleEarnMusd();

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.WALLET.CASH_TOKENS_FULL_VIEW,
      );
    });

    it('navigates to WALLET.HOME when geo-eligible but money hub is disabled', () => {
      jest.mocked(selectIsMusdConversionGeoEligible).mockReturnValue(true);
      jest.mocked(selectMoneyHubEnabledFlag).mockReturnValue(false);

      handleEarnMusd();

      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
    });

    it('navigates to WALLET.HOME when geo-ineligible', () => {
      jest.mocked(selectIsMusdConversionGeoEligible).mockReturnValue(false);

      handleEarnMusd();

      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
    });

    it('does not navigate to the education screen', () => {
      handleEarnMusd();

      expect(mockNavigate).not.toHaveBeenCalledWith(Routes.EARN.ROOT, {
        screen: Routes.EARN.MUSD.CONVERSION_EDUCATION,
        params: { isDeeplink: true },
      });
    });
  });

  it('falls back to WALLET.HOME on navigation error', () => {
    mockNavigate.mockImplementationOnce(() => {
      throw new Error('Navigation error');
    });

    handleEarnMusd();

    expect(mockNavigate).toHaveBeenCalledTimes(2);
    expect(mockNavigate).toHaveBeenLastCalledWith(Routes.WALLET.HOME);
  });

  it('logs error when navigation fails', () => {
    const error = new Error('Navigation error');
    mockNavigate.mockImplementationOnce(() => {
      throw error;
    });

    handleEarnMusd();

    expect(DevLogger.log).toHaveBeenCalledWith(
      '[handleEarnMusd] Failed to handle deeplink:',
      error,
    );
    expect(Logger.error).toHaveBeenCalledWith(
      error,
      '[handleEarnMusd] Error handling earn-musd deeplink',
    );
  });

  it('logs error when fallback navigation also fails', () => {
    const primaryError = new Error('Primary navigation error');
    const fallbackError = new Error('Fallback navigation error');
    mockNavigate
      .mockImplementationOnce(() => {
        throw primaryError;
      })
      .mockImplementationOnce(() => {
        throw fallbackError;
      });

    handleEarnMusd();

    expect(Logger.error).toHaveBeenCalledWith(
      primaryError,
      '[handleEarnMusd] Error handling earn-musd deeplink',
    );
    expect(Logger.error).toHaveBeenCalledWith(
      fallbackError,
      '[handleEarnMusd] Failed to navigate to fallback screen',
    );
  });
});
