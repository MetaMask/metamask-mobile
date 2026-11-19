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

    it('passes tokenType to the bridge route while ignoring unrelated query params', () => {
      const intent = createMoneyDepositDeeplinkIntent({
        moneyDepositPath:
          '?utm_source=braze&tokenType=atoken&utm_campaign=earn',
      });

      expect(intent).toEqual({
        target: {
          type: 'main-stack',
          routeName: Routes.MONEY.DEPOSIT_DEEPLINK,
          params: {
            tokenType: 'atoken',
          },
        },
      });
    });

    it('preserves an unknown tokenType for future bridge resolvers', () => {
      const intent = createMoneyDepositDeeplinkIntent({
        moneyDepositPath: '?tokenType=future-token',
      });

      expect(intent.target.params).toEqual({
        tokenType: 'future-token',
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

    it('executes the bridge route intent with the Money deposit path', async () => {
      const moneyDepositPath = '?tokenType=atoken&utm_source=braze';

      await handleMoneyDeposit({ moneyDepositPath });

      expect(mockExecuteDeeplinkIntent).toHaveBeenCalledWith(
        createMoneyDepositDeeplinkIntent({ moneyDepositPath }),
      );
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
