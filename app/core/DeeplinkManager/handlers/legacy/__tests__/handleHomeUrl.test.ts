import NavigationService from '../../../../NavigationService';
import { setContentPreviewToken } from '../../../../../actions/notification/helpers';
import { navigateToHomeUrl } from '../handleHomeUrl';
import Routes from '../../../../../constants/navigation/Routes';
import { NAVIGATION_PARAMS_DELAY_MS } from '../../../../../constants/navigation/delays';

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
      mockSetParams,
      mockSetContentPreviewToken,
    };
  };

  it('navigates to home screen without sending any query params', () => {
    const mocks = arrangeMocks();
    navigateToHomeUrl({ homePath: 'home' });

    expect(mocks.mockSetContentPreviewToken).toHaveBeenCalledWith(null);
    expect(mocks.mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
    expect(mocks.mockSetParams).not.toHaveBeenCalled();
  });

  it('sends previewToken and navigates to home screen', () => {
    const mocks = arrangeMocks();
    navigateToHomeUrl({ homePath: 'home?previewToken=ABC' });

    expect(mocks.mockSetContentPreviewToken).toHaveBeenCalledWith('ABC');
    expect(mocks.mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
    expect(mocks.mockSetParams).not.toHaveBeenCalled();
  });

  it('sets openNetworkSelector param when requested', () => {
    const mocks = arrangeMocks();
    navigateToHomeUrl({ homePath: 'home?openNetworkSelector=true' });

    expect(mocks.mockSetContentPreviewToken).toHaveBeenCalledWith(null);
    expect(mocks.mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);

    jest.advanceTimersByTime(NAVIGATION_PARAMS_DELAY_MS);

    expect(mocks.mockSetParams).toHaveBeenCalledWith({
      openNetworkSelector: true,
    });
  });

  it('falls back to navigated to home sceen when no homePath', () => {
    const mocks = arrangeMocks();
    navigateToHomeUrl({ homePath: undefined });

    expect(mocks.mockSetContentPreviewToken).toHaveBeenCalledWith(null);
    expect(mocks.mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
    expect(mocks.mockSetParams).not.toHaveBeenCalled();
  });
});
