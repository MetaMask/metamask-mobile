import NavigationService from '../../../../NavigationService';
import { setContentPreviewToken } from '../../../../../actions/notification/helpers';
import { navigateToHomeUrl } from '../handleHomeUrl';
import Routes from '../../../../../constants/navigation/Routes';
import { PERFORMANCE_CONFIG } from '../../../../../components/UI/Perps/constants/perpsConfig';

jest.mock('../../../../NavigationService');
jest.mock('../../../../../actions/notification/helpers');

describe('navigateToHomeUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  const arrangeMocks = () => {
    const mockNavigate = jest.fn();
    const mockSetParams = jest.fn();
    NavigationService.navigation = {
      navigate: mockNavigate,
      setParams: mockSetParams,
    } as unknown as typeof NavigationService.navigation;

    const mockSetContentPreviewToken = jest.mocked(setContentPreviewToken);

    return {
      mockNavigate,
      mockSetContentPreviewToken,
      mockSetParams,
    };
  };

  it('navigates to home screen without sending any query params', () => {
    const mocks = arrangeMocks();
    navigateToHomeUrl({ homePath: 'home' });

    expect(mocks.mockSetContentPreviewToken).toHaveBeenCalledWith(null);
    expect(mocks.mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
  });

  it('sends previewToken and navigates to home screen', () => {
    const mocks = arrangeMocks();
    navigateToHomeUrl({ homePath: 'home?previewToken=ABC' });

    expect(mocks.mockSetContentPreviewToken).toHaveBeenCalledWith('ABC');
    expect(mocks.mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
  });

  it('navigates to home screen with openNetworkSelector param when requested', () => {
    const mocks = arrangeMocks();
    navigateToHomeUrl({ homePath: 'home?openNetworkSelector=true' });

    expect(mocks.mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
    jest.advanceTimersByTime(PERFORMANCE_CONFIG.NavigationParamsDelayMs);
    expect(mocks.mockSetParams).toHaveBeenCalledWith({
      openNetworkSelector: true,
    });
  });
});
