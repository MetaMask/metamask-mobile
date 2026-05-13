import NavigationService from '../../../../NavigationService';
import Routes from '../../../../../constants/navigation/Routes';
import DevLogger from '../../../../SDKConnect/utils/DevLogger';
import { WhatsHappeningSource } from '../../../../../components/Views/Homepage/Sections/WhatsHappening/constants';
import { handleWhatsHappeningUrl } from '../handleWhatsHappeningUrl';

jest.mock('../../../../NavigationService', () => ({
  navigation: {
    navigate: jest.fn(),
  },
}));

jest.mock('../../../../SDKConnect/utils/DevLogger', () => ({
  log: jest.fn(),
}));

describe('handleWhatsHappeningUrl', () => {
  const mockNavigate = NavigationService.navigation.navigate as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('navigates to WhatsHappeningDetailView from a deeplink source', () => {
    handleWhatsHappeningUrl();

    expect(mockNavigate).toHaveBeenCalledWith(Routes.WHATS_HAPPENING_DETAIL, {
      source: WhatsHappeningSource.Deeplink,
    });
  });

  it('falls back to wallet home on navigation errors', () => {
    mockNavigate.mockImplementationOnce(() => {
      throw new Error('Navigation error');
    });

    handleWhatsHappeningUrl();

    expect(mockNavigate).toHaveBeenCalledTimes(2);
    expect(mockNavigate).toHaveBeenLastCalledWith(Routes.WALLET.HOME);
    expect(DevLogger.log).toHaveBeenCalledWith(
      '[handleWhatsHappeningUrl] Failed to handle deeplink:',
      expect.any(Error),
    );
  });
});
