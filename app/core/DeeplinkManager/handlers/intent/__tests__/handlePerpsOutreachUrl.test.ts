import Routes from '../../../../../constants/navigation/Routes';
import NavigationService from '../../../../NavigationService';
import DevLogger from '../../../../SDKConnect/utils/DevLogger';
import { executeDeeplinkIntent } from '../../../utils/executeDeeplinkIntent';
import {
  createPerpsOutreachDeeplinkIntent,
  handlePerpsOutreachUrl,
} from '../handlePerpsOutreachUrl';

jest.mock('../../../../NavigationService', () => ({
  navigation: { navigate: jest.fn() },
}));

jest.mock('../../../../SDKConnect/utils/DevLogger', () => ({
  log: jest.fn(),
}));

jest.mock('../../../utils/executeDeeplinkIntent', () => ({
  executeDeeplinkIntent: jest.fn(),
}));

const mockNavigate = NavigationService.navigation.navigate as jest.Mock;
const mockExecuteDeeplinkIntent = jest.mocked(executeDeeplinkIntent);
const mockLog = DevLogger.log as jest.Mock;

describe('handlePerpsOutreachUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createPerpsOutreachDeeplinkIntent', () => {
    it('targets the outreach details modal inside the Perps modal stack', () => {
      // Startup resolution reuses this intent, so it must always route into
      // the modal stack regardless of the current navigator state.
      expect(createPerpsOutreachDeeplinkIntent()).toEqual({
        target: {
          type: 'main-stack',
          routeName: Routes.PERPS.MODALS.ROOT,
          params: {
            screen: Routes.PERPS.MODALS.OUTREACH_DETAILS,
          },
        },
      });
    });
  });

  describe('handlePerpsOutreachUrl', () => {
    it('executes the intent to open the outreach details modal', async () => {
      mockExecuteDeeplinkIntent.mockResolvedValueOnce(undefined);

      await handlePerpsOutreachUrl();

      expect(mockExecuteDeeplinkIntent).toHaveBeenCalledTimes(1);
      expect(mockExecuteDeeplinkIntent).toHaveBeenCalledWith(
        createPerpsOutreachDeeplinkIntent(),
      );
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('falls back to wallet home when navigation throws', async () => {
      const error = new Error('nav rejected');
      mockExecuteDeeplinkIntent.mockRejectedValueOnce(error);

      await handlePerpsOutreachUrl();

      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
      expect(mockLog).toHaveBeenCalledWith(
        'Failed to handle perps outreach deeplink:',
        error,
      );
    });
  });
});
