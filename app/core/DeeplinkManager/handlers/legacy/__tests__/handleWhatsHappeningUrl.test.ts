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

  it('navigates to WhatsHappeningDetailView with index 0', () => {
    handleWhatsHappeningUrl({ actionPath: '' });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.WHATS_HAPPENING_DETAIL, {
      initialIndex: 0,
      source: WhatsHappeningSource.Deeplink,
    });
  });

  it('ignores index query params and still navigates to index 0', () => {
    handleWhatsHappeningUrl({ actionPath: '?index=2' });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.WHATS_HAPPENING_DETAIL, {
      initialIndex: 0,
      source: WhatsHappeningSource.Deeplink,
    });
  });

  it.each(['?index=-1', '?index=1.5', '?index=abc', '?index=5'])(
    'ignores invalid index query param %s',
    (actionPath) => {
      handleWhatsHappeningUrl({ actionPath });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.WHATS_HAPPENING_DETAIL, {
        initialIndex: 0,
        source: WhatsHappeningSource.Deeplink,
      });
    },
  );

  it('falls back to wallet home on navigation errors', () => {
    mockNavigate.mockImplementationOnce(() => {
      throw new Error('Navigation error');
    });

    handleWhatsHappeningUrl({ actionPath: '?index=2' });

    expect(mockNavigate).toHaveBeenCalledTimes(2);
    expect(mockNavigate).toHaveBeenLastCalledWith(Routes.WALLET.HOME);
    expect(DevLogger.log).toHaveBeenCalledWith(
      '[handleWhatsHappeningUrl] Failed to handle deeplink:',
      expect.any(Error),
    );
  });
});
