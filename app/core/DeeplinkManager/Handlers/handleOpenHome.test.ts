import { handleOpenHome } from './handleOpenHome';
import NavigationService from '../../NavigationService';
import Routes from '../../../constants/navigation/Routes';

jest.mock('../../NavigationService', () => ({
  navigation: {
    navigate: jest.fn(),
  },
}));

describe('handleOpenHome', () => {
  const mockNavigate = NavigationService.navigation.navigate as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should navigate to wallet home route', () => {
    handleOpenHome();

    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });
});
