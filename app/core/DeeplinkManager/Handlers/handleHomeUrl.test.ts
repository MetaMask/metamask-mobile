import NavigationService from '../../NavigationService';
import { setContentPreviewToken } from '../../../actions/notification/helpers';
import { handleHomeUrl } from './handleHomeUrl';
import Routes from '../../../constants/navigation/Routes';

jest.mock('../../NavigationService');
jest.mock('../../../actions/notification/helpers');

describe('handleHomeUrl', () => {
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
    handleHomeUrl({ homePath: 'home' });

    expect(mocks.mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
    expect(mocks.mockSetContentPreviewToken).toHaveBeenCalledWith(null);
  });

  it('navigates to home screen and sends previewToken', () => {
    const mocks = arrangeMocks();
    handleHomeUrl({ homePath: 'home?previewToken=ABC' });

    expect(mocks.mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
    expect(mocks.mockSetContentPreviewToken).toHaveBeenCalledWith('ABC');
  });
});
