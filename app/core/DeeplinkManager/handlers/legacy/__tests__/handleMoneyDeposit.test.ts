import { handleMoneyDeposit } from '../handleMoneyDeposit';
import NavigationService from '../../../../NavigationService';
import Routes from '../../../../../constants/navigation/Routes';
import DevLogger from '../../../../SDKConnect/utils/DevLogger';
import Logger from '../../../../../util/Logger';

jest.mock('../../../../NavigationService');
jest.mock('../../../../SDKConnect/utils/DevLogger');
jest.mock('../../../../../util/Logger');

describe('handleMoneyDeposit', () => {
  let mockNavigate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate = jest.fn();
    NavigationService.navigation = {
      navigate: mockNavigate,
    } as unknown as typeof NavigationService.navigation;
  });

  it('navigates to the React bridge route', () => {
    handleMoneyDeposit();

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.DEPOSIT_DEEPLINK);
  });

  it('logs the error and navigates home when the bridge route fails', () => {
    const error = new Error('bridge navigation failed');
    mockNavigate
      .mockImplementationOnce(() => {
        throw error;
      })
      .mockImplementationOnce(jest.fn());

    handleMoneyDeposit();

    expect(DevLogger.log).toHaveBeenCalledWith(
      '[handleMoneyDeposit] Failed to navigate to the bridge route:',
      error,
    );
    expect(Logger.error).toHaveBeenCalledWith(
      error,
      '[handleMoneyDeposit] Error handling deposit deeplink',
    );
    expect(mockNavigate).toHaveBeenLastCalledWith(Routes.WALLET.HOME);
  });
});
