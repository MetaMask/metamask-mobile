import NavigationService from '../../../../NavigationService';
import { setContentPreviewToken } from '../../../../../actions/notification/helpers';
import { navigateToHomeUrl } from '../handleHomeUrl';
import Routes from '../../../../../constants/navigation/Routes';

jest.mock('../../../../NavigationService');
jest.mock('../../../../../actions/notification/helpers');

describe('navigateToHomeUrl', () => {
  beforeEach(() => jest.clearAllMocks());

  const arrangeMocks = () => {
    const mockNavigate = jest.fn();
    NavigationService.navigation = {
      navigate: mockNavigate,
    } as unknown as typeof NavigationService.navigation;

    const mockSetContentPreviewToken = jest.mocked(setContentPreviewToken);

    return {
      mockNavigate,
      mockSetContentPreviewToken,
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

  it('falls back to navigated to home sceen when no homePath', () => {
    const mocks = arrangeMocks();
    navigateToHomeUrl({ homePath: undefined });

    expect(mocks.mockSetContentPreviewToken).toHaveBeenCalledWith(null);
    expect(mocks.mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
  });
});
