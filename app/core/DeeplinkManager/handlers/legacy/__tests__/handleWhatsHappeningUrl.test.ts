import NavigationService from '../../../../NavigationService';
import Routes from '../../../../../constants/navigation/Routes';
import DevLogger from '../../../../SDKConnect/utils/DevLogger';
import { WhatsHappeningSource } from '../../../../../components/UI/WhatsHappening/constants';
import { handleWhatsHappeningUrl } from '../handleWhatsHappeningUrl';

const mockTrace = jest.fn();
const mockEndTrace = jest.fn();

jest.mock('../../../../../util/trace', () => ({
  ...jest.requireActual('../../../../../util/trace'),
  trace: (...args: unknown[]) => mockTrace(...args),
  endTrace: (...args: unknown[]) => mockEndTrace(...args),
}));

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

  describe('without an id', () => {
    it('opens the detail view on the first card', () => {
      handleWhatsHappeningUrl();

      expect(mockNavigate).toHaveBeenCalledWith(Routes.WHATS_HAPPENING_DETAIL, {
        source: WhatsHappeningSource.Deeplink,
        initialIndex: 0,
      });
      expect(mockTrace).toHaveBeenCalledWith({
        name: "What's Happening View Load",
        op: 'whats_happening.load',
        id: 'deeplink:expanded',
        tags: {
          feature: 'whats_happening',
          source: 'deeplink',
          stage: 'expanded',
          cache_state: 'cold',
        },
      });
    });

    it('does not pass an outdatedItemId', () => {
      handleWhatsHappeningUrl();

      const [, params] = mockNavigate.mock.calls[0];
      expect(params).not.toHaveProperty('outdatedItemId');
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
      expect(mockEndTrace).toHaveBeenCalledWith({
        name: "What's Happening View Load",
        id: 'deeplink:expanded',
        data: {
          result: 'cancelled',
          success: false,
          reason: 'owner_cancelled',
        },
      });
    });
  });

  describe('with an id', () => {
    const id = 'a3f1c2d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d';

    it('opens the detail view with the outdatedItemId param', () => {
      handleWhatsHappeningUrl({ id });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.WHATS_HAPPENING_DETAIL, {
        source: WhatsHappeningSource.Deeplink,
        initialIndex: 0,
        outdatedItemId: id,
      });
    });

    it('does not navigate to the Explore/Trending view', () => {
      handleWhatsHappeningUrl({ id });

      expect(mockNavigate).not.toHaveBeenCalledWith(
        Routes.TRENDING_VIEW,
        expect.anything(),
      );
    });

    it('falls back to wallet home on navigation errors', () => {
      mockNavigate.mockImplementationOnce(() => {
        throw new Error('Navigation error');
      });

      handleWhatsHappeningUrl({ id });

      expect(mockNavigate).toHaveBeenLastCalledWith(Routes.WALLET.HOME);
    });
  });
});
