import NavigationService from '../../../../NavigationService';
import Routes from '../../../../../constants/navigation/Routes';
import DevLogger from '../../../../SDKConnect/utils/DevLogger';
import ReduxService from '../../../../redux';
import {
  setWhatsHappeningOutdatedItemId,
  clearWhatsHappeningOutdatedItemId,
} from '../../../../../reducers/whatsHappeningDeeplink';
import { EXPLORE_TAB_INDEX } from '../../../../../constants/navigation/exploreTabIndices';
import { WhatsHappeningSource } from '../../../../../components/UI/WhatsHappening/constants';
import { handleWhatsHappeningUrl } from '../handleWhatsHappeningUrl';

jest.mock('../../../../NavigationService', () => ({
  navigation: {
    navigate: jest.fn(),
  },
}));

jest.mock('../../../../SDKConnect/utils/DevLogger', () => ({
  log: jest.fn(),
}));

jest.mock('../../../../redux', () => ({
  __esModule: true,
  default: {
    store: {
      dispatch: jest.fn(),
    },
  },
}));

describe('handleWhatsHappeningUrl', () => {
  const mockNavigate = NavigationService.navigation.navigate as jest.Mock;
  const mockDispatch = ReduxService.store.dispatch as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('without an id', () => {
    it('navigates to WhatsHappeningDetailView from a deeplink source', () => {
      handleWhatsHappeningUrl();

      expect(mockNavigate).toHaveBeenCalledWith(Routes.WHATS_HAPPENING_DETAIL, {
        source: WhatsHappeningSource.Deeplink,
      });
    });

    it('clears any previously stored outdated item id', () => {
      handleWhatsHappeningUrl();

      expect(mockDispatch).toHaveBeenCalledWith(
        clearWhatsHappeningOutdatedItemId(),
      );
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

  describe('with an id', () => {
    const id = 'a3f1c2d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d';

    it('stores the id so the carousel can render the outdated item', () => {
      handleWhatsHappeningUrl({ id });

      expect(mockDispatch).toHaveBeenCalledWith(
        setWhatsHappeningOutdatedItemId(id),
      );
    });

    it('opens the Explore "Now" tab where the carousel lives', () => {
      handleWhatsHappeningUrl({ id });

      expect(mockNavigate).toHaveBeenCalledWith(Routes.TRENDING_VIEW, {
        initialTab: EXPLORE_TAB_INDEX.NOW,
        source: WhatsHappeningSource.Deeplink,
      });
      expect(mockNavigate).not.toHaveBeenCalledWith(
        Routes.WHATS_HAPPENING_DETAIL,
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
