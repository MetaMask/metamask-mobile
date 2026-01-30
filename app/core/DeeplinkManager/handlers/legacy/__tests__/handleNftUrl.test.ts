import { handleNftUrl } from '../handleNftUrl';
import NavigationService from '../../../../NavigationService';
import Routes from '../../../../../constants/navigation/Routes';

jest.mock('../../../../NavigationService', () => ({
  navigation: {
    navigate: jest.fn(),
  },
}));

jest.mock('../../../../SDKConnect/utils/DevLogger', () => ({
  log: jest.fn(),
}));

describe('handleNftUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('navigates to NFTS_FULL_VIEW', () => {
    handleNftUrl();

    expect(NavigationService.navigation.navigate).toHaveBeenCalledWith(
      Routes.WALLET.NFTS_FULL_VIEW,
    );
  });

  it('falls back to WALLET.HOME on error', () => {
    // Force an error by mocking navigate to throw
    (NavigationService.navigation.navigate as jest.Mock).mockImplementationOnce(
      () => {
        throw new Error('Navigation failed');
      },
    );

    handleNftUrl();

    // Second call should be fallback
    expect(NavigationService.navigation.navigate).toHaveBeenLastCalledWith(
      Routes.WALLET.HOME,
    );
  });
});
