import NavigationService from '../../../../NavigationService';
import Routes from '../../../../../constants/navigation/Routes';
import DevLogger from '../../../../SDKConnect/utils/DevLogger';
import Logger from '../../../../../util/Logger';
import { executeDeeplinkIntent } from '../../../utils/executeDeeplinkIntent';
import {
  createMoneyDepositDeeplinkIntent,
  handleMoneyDeposit,
} from '../handleMoneyDeposit';

jest.mock('../../../../NavigationService', () => ({
  navigation: {
    navigate: jest.fn(),
  },
}));
jest.mock('../../../../SDKConnect/utils/DevLogger', () => ({
  log: jest.fn(),
}));
jest.mock('../../../../../util/Logger', () => ({
  error: jest.fn(),
}));
jest.mock('../../../utils/executeDeeplinkIntent', () => ({
  executeDeeplinkIntent: jest.fn(),
}));

const mockNavigate = NavigationService.navigation.navigate as jest.Mock;
const mockExecuteDeeplinkIntent = jest.mocked(executeDeeplinkIntent);
const mockLog = DevLogger.log as jest.Mock;

describe('Money deposit deeplink', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExecuteDeeplinkIntent.mockResolvedValue(undefined);
  });

  describe('createMoneyDepositDeeplinkIntent', () => {
    it('targets the Money deposit bridge route on the main stack', () => {
      const intent = createMoneyDepositDeeplinkIntent();

      expect(intent).toEqual({
        target: {
          type: 'main-stack',
          routeName: Routes.MONEY.DEPOSIT_DEEPLINK,
        },
      });
    });
  });

  describe('handleMoneyDeposit', () => {
    it('executes the Money deposit bridge route intent', async () => {
      await handleMoneyDeposit();

      expect(mockExecuteDeeplinkIntent).toHaveBeenCalledWith(
        createMoneyDepositDeeplinkIntent(),
      );
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('logs the error and navigates home when intent execution fails', async () => {
      const error = new Error('bridge route execution failed');
      mockExecuteDeeplinkIntent.mockRejectedValueOnce(error);

      await handleMoneyDeposit();

      expect(mockLog).toHaveBeenCalledWith(
        '[handleMoneyDeposit] Failed to execute the bridge route intent:',
        error,
      );
      expect(Logger.error).toHaveBeenCalledWith(
        error,
        '[handleMoneyDeposit] Error handling deposit deeplink',
      );
      expect(mockNavigate).toHaveBeenLastCalledWith(Routes.WALLET.HOME);
    });
  });
});
